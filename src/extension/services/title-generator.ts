import * as State from "@/extension/core/state";
import { sanitizeFilename } from "@/lib/utils";

export async function generateChatTitle(): Promise<string> {
  try {
    if (State.get.history.length === 0) {
      return "empty_chat";
    }

    const contextMessages = State.get.history
      .slice(0, 3)
      .map((msg) => `${msg.role}: ${msg.content.slice(0, 200)}`)
      .join("\n");

    const { client, config } = State.get;
    const response = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Generate a 5 word or less snake_case title that summarizes this chat conversation. Use only lowercase letters, numbers, and underscores. Be concise and descriptive.",
        },
        {
          role: "user",
          content: `Summarize this chat in 5 words or less using snake_case:\n\n${contextMessages}`,
        },
      ],
      model: config.model,
      temperature: 0.3,
      max_completion_tokens: 20,
    });

    const title =
      response.choices?.[0]?.message?.content?.trim() || "chat_summary";
    return sanitizeFilename(title) || "chat_summary";
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return `chat_${Date.now().toString().slice(-6)}`;
  }
}
