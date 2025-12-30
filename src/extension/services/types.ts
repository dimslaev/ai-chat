// Type definitions for streaming handlers and results
import { Message, Plan } from "@/lib/types";

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
  onSetPlan?: (plan: Plan | null) => void;
};

export type StreamResult = {
  textStream: AsyncIterable<string>;
  usage: PromiseLike<{
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
  }>;
};
