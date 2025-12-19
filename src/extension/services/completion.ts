import { DEFAULT_SYSTEM_PROMPT } from "@/lib/config";
import { OpenAIMessage } from "@/lib/types";
import { toOpenAIMessage } from "@/lib/utils";
import * as State from "@/extension/core/state";
import { readFiles } from "@/extension/services/fileReader";
import { handleStream, StreamHandlers } from "@/extension/services/stream";

export type CompletionHandlers = StreamHandlers;

export async function prepareMessages(): Promise<OpenAIMessage[]> {
  const { config, history, files } = State.get;
  const messages: OpenAIMessage[] = history
    .slice(-config.historyLimit)
    .map(toOpenAIMessage);

  console.log(
    `Preparing messages (history: ${messages.length}, files: ${files.length})`
  );

  if (files.length > 0) {
    const fileContents = await readFiles(files);
    fileContents.forEach((content: OpenAIMessage) => messages.unshift(content));
  }

  messages.unshift({
    role: "system",
    content: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
  });

  return messages;
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
