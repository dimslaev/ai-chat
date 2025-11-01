import * as vscode from "vscode";
import {
  OpenAIMessage,
  AttachedFile,
  MessageCategory,
  OpenAIStream,
} from "../lib/types";
import { toOpenAIMessage } from "../lib/utils";
import { State } from "./state";
import { Prompts } from "./prompts";

export namespace Chat {
  export type CompletionHandlers = {
    onStart: () => void;
    onChunk: (content: string) => void;
    onEnd: () => void;
    onError: (error: unknown) => void;
  };

  export async function prepareMessages(): Promise<OpenAIMessage[]> {
    const { config, history, files, category } = State;
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
    const systemPrompt = getSystemPrompt(category);
    messages.unshift({ role: "system", content: systemPrompt });

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

        // If selection is specified, extract only those lines
        let fileContent = fullContent;
        let contextInfo = "";

        if (file.selection) {
          const lines = fullContent.split("\n");
          const { start, end } = file.selection;

          // Extract selected lines (inclusive range)
          const selectedLines = lines.slice(start, end + 1);
          fileContent = selectedLines.join("\n");

          // Add context info about the selection
          contextInfo = ` (lines ${start + 1}-${end + 1})`;
        }

        return {
          role: "user" as const,
          content: Prompts.FILE_CONTEXT_PROMPT(
            `${file.name}${contextInfo}`,
            fileContent
          ),
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

  export function getSystemPrompt(category: MessageCategory): string {
    const { config } = State;
    const basePrompt = Prompts.CATEGORY_SYSTEM_PROMPTS[category];

    const customPrompt = config.systemPrompt?.trim();

    if (!customPrompt) {
      return basePrompt;
    }

    const finalPrompt = config.replaceSystemPrompt
      ? customPrompt
      : `${basePrompt}\n\nAdditional instructions: ${customPrompt}`;

    console.log(
      `Using system prompt for category: ${category || "default"}${
        customPrompt
          ? ` with ${
              config.replaceSystemPrompt ? "replaced" : "appended"
            } instructions`
          : ""
      }`
    );
    return finalPrompt;
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
          max_completion_tokens: config.maxTokens,
          stream: true,
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
