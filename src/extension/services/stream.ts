import { State } from "@/extension/core/state";
import { StreamHandlers, StreamResult } from "@/extension/services/types";
import { Message } from "@/lib/types";

/**
 * Stream response handling
 * chunks, token usage, and history finalization
 */

export async function handleStream(
  streamResult: StreamResult,
  handlers: StreamHandlers,
): Promise<void> {
  const { history, abort } = State;
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

function finalizeResponse(reply: string, history: Message[]): void {
  if (reply.trim()) {
    history.push({
      id: Date.now().toString(),
      role: "assistant",
      content: reply,
    });
  }
}
