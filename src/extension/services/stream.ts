import * as State from "@/extension/core/state";
import { Message, OpenAIStream } from "@/lib/types";

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

export async function handleStream(
  stream: OpenAIStream,
  handlers: StreamHandlers,
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

    finalizeResponse(reply, history);
    handlers.onEnd();
  } catch (error) {
    handlers.onEnd();
    if (!abort.signal.aborted) {
      handlers.onError(error);
    }
  }
}
