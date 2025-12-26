import * as State from "@/extension/core/state";
import { Message } from "@/lib/types";

export type StreamHandlers = {
  onStart: () => void;
  onChunk: (content: string) => void;
  onEnd: () => void;
  onError: (error: unknown) => void;
  onToolMessage?: (message: Message) => void;
  onTokenUsage?: (usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }) => void;
};

function finalizeResponse(reply: string, history: Message[]): void {
  if (reply.trim()) {
    history.push({
      id: Date.now().toString(),
      role: "assistant",
      content: reply,
    });
  }
}

type StreamResult = {
  textStream: AsyncIterable<string>;
  usage: PromiseLike<{
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
  }>;
};

export async function handleStream(
  streamResult: StreamResult,
  handlers: StreamHandlers,
): Promise<void> {
  const { history, abort } = State.get;
  let reply = "";

  handlers.onStart();

  try {
    for await (const chunk of streamResult.textStream) {
      if (abort.signal.aborted) {
        throw new Error("Request aborted");
      }

      if (chunk) {
        reply += chunk;
        handlers.onChunk(chunk);
      }
    }

    const usage = await streamResult.usage;
    if (usage && handlers.onTokenUsage) {
      handlers.onTokenUsage({
        prompt_tokens: usage.inputTokens,
        completion_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
      });
    }

    finalizeResponse(reply, history);
    handlers.onEnd();
  } catch (error) {
    handlers.onEnd();
    if (!abort.signal.aborted) {
      handlers.onError(error);
    }
  }
}
