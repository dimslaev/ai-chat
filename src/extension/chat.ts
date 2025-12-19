import * as vscode from "vscode";
import { PdfReader } from "pdfreader";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/config";
import { OpenAIMessage, AttachedFile, OpenAIStream } from "@/lib/types";
import {
  toOpenAIMessage,
  isImageFile,
  getImageMimeType,
  isPdfFile,
} from "@/lib/utils";
import * as State from "@/extension/state";

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
  const { config, history, files } = State.get;
  const messages: OpenAIMessage[] = history
    .slice(-config.historyLimit)
    .map(toOpenAIMessage);

  console.log(
    `Preparing messages (history: ${messages.length}, files: ${files.length})`
  );

  // Add file contents as context
  if (files.length > 0) {
    const fileContents = await readFiles(files);
    fileContents.forEach((content: OpenAIMessage) => messages.unshift(content));
  }

  // Add system prompt
  messages.unshift({
    role: "system",
    content: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
  });

  return messages;
}

function readImageFile(name: string, data: Uint8Array): OpenAIMessage {
  const base64Data = Buffer.from(data).toString("base64");
  const mimeType = getImageMimeType(name);
  return {
    role: "user",
    content: [
      { type: "text", text: `Image: ${name}` },
      {
        type: "image_url",
        image_url: { url: `data:image/${mimeType};base64,${base64Data}` },
      },
    ],
  };
}

async function readPdfFile(name: string, data: Uint8Array): Promise<OpenAIMessage> {
  const text = await new Promise<string>((resolve, reject) => {
    const textParts: string[] = [];
    new PdfReader().parseBuffer(
      Buffer.from(data),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any, item: any) => {
        if (err) {
          reject(err);
        } else if (!item) {
          resolve(textParts.join(" "));
        } else if (item.text) {
          textParts.push(item.text);
        }
      }
    );
  });
  return {
    role: "user",
    content: `Context: PDF file ${name}\n${text}`,
  };
}

function readTextFile(file: AttachedFile, data: Uint8Array): OpenAIMessage {
  const fullContent = Buffer.from(data).toString("utf8");
  let fileContent = fullContent;

  if (file.selections && file.selections.length > 0) {
    const lines = fullContent.split("\n");
    fileContent = file.selections
      .map(({ start, end }) => {
        const selectedLines = lines.slice(start, end + 1);
        return `Lines ${start + 1}-${end + 1}:\n${selectedLines.join("\n")}`;
      })
      .join("\n\n");
  }

  return {
    role: "user",
    content: `Context: Using file ${file.name}\n${fileContent}`,
  };
}

async function readFile(file: AttachedFile): Promise<OpenAIMessage> {
  const data = await vscode.workspace.fs.readFile(file.fileUri);

  if (isImageFile(file.name)) {
    return readImageFile(file.name, data);
  }
  if (isPdfFile(file.name)) {
    return readPdfFile(file.name, data);
  }
  return readTextFile(file, data);
}

export async function readFiles(files: AttachedFile[]): Promise<OpenAIMessage[]> {
  const results = await Promise.allSettled(files.map(readFile));

  return results
    .map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      console.error(`Failed to read file ${files[index].name}:`, result.reason);
      return null;
    })
    .filter((msg): msg is OpenAIMessage => msg !== null);
}

export async function createCompletion(
  handlers: CompletionHandlers
): Promise<void> {
  const { client, config, abort } = State.get;

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
  const { history, abort } = State.get;
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
