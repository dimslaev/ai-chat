import * as vscode from "vscode";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/config";
import { OpenAIMessage, AttachedFile, OpenAIStream } from "@/lib/types";
import { toOpenAIMessage } from "@/lib/utils";
import { State } from "@/extension/state";

export namespace Chat {
  export type CompletionHandlers = {
    onStart: () => void;
    onChunk: (content: string) => void;
    onEnd: () => void;
    onError: (error: unknown) => void;
    onTokenUsage?: (usage: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    }) => void;
  };

  export async function prepareMessages(): Promise<OpenAIMessage[]> {
    const { config, history, files } = State;
    const messages: OpenAIMessage[] = history
      .slice(-config.historyLimit)
      .map(toOpenAIMessage);

    console.log(
      `Preparing messages (history: ${messages.length}, files: ${files.length})`
    );

    // Add file contents as context
    if (files.length > 0) {
      const fileContents = await readFiles(files);
      fileContents.forEach((content: OpenAIMessage) =>
        messages.unshift(content)
      );
    }

    // Add system prompt
    messages.unshift({
      role: "system",
      content: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    });

    return messages;
  }

  export async function readFiles(
    files: AttachedFile[]
  ): Promise<OpenAIMessage[]> {
    const fileMessages: OpenAIMessage[] = [];

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const fileData = await vscode.workspace.fs.readFile(file.fileUri);
        const fullContent = Buffer.from(fileData).toString("utf8");

        let fileContent = fullContent;

        if (file.selections && file.selections.length > 0) {
          const lines = fullContent.split("\n");
          const selectedContent = file.selections
            .map(({ start, end }) => {
              const selectedLines = lines.slice(start, end + 1);
              return `Lines ${start + 1}-${end + 1}:\n${selectedLines.join(
                "\n"
              )}`;
            })
            .join("\n\n");

          fileContent = selectedContent;
        }

        return {
          role: "user" as const,
          content: `Context: Using file ${file.name}\n${fileContent}`,
        };
      })
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        fileMessages.push(result.value);
      } else {
        console.error(
          `Failed to read file ${files[index].name}:`,
          result.reason
        );
      }
    });

    return fileMessages;
  }

  export async function createCompletion(
    handlers: CompletionHandlers
  ): Promise<void> {
    const { client, config, abort } = State;

    console.log(`Starting completion (model: ${config.model})`);

    try {
      const messages = await prepareMessages();
      console.log(`Sending ${messages.length} messages`);

      const response = await client.chat.completions.create(
        {
          messages,
          model: config.model,
          temperature: config.temperature,
          max_completion_tokens: config.maxCompletionTokens,
          frequency_penalty: config.frequencyPenalty,
          presence_penalty: config.presencePenalty,
          top_p: config.topP,
          stream: true,
          stream_options: {
            include_usage: true,
          },
        },
        { signal: abort.signal }
      );

      console.log("Received streaming response");
      await handleStream(response, handlers);
    } catch (error) {
      console.error("Completion failed:", error);
      handlers.onError(error);
    }
  }

  async function handleStream(
    stream: OpenAIStream,
    handlers: CompletionHandlers
  ): Promise<void> {
    const { history, abort } = State;
    let reply = "";

    handlers.onStart();

    try {
      for await (const chunk of stream) {
        if (abort.signal.aborted) {
          throw new Error("Request aborted");
        }

        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          reply += content;
          handlers.onChunk(content);
        }

        if (chunk.usage && handlers.onTokenUsage) {
          handlers.onTokenUsage({
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens,
          });
        }
      }

      // Only add to history if we got a complete response
      if (reply.trim()) {
        history.push({
          id: Date.now().toString(),
          role: "assistant",
          content: reply,
        });
      }

      handlers.onEnd();
    } catch (error) {
      handlers.onEnd();
      if (!abort.signal.aborted) {
        handlers.onError(error);
      }
    }
  }
}
