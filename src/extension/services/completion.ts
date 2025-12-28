import { generateText, ModelMessage, stepCountIs, streamText } from "ai";

import { createModel } from "@/extension/core/providers";
import { State } from "@/extension/core/state";
import { mcpManager } from "@/extension/mcp/manager";
import { FileReader } from "@/extension/services/file-reader";
import { handleStream } from "@/extension/services/stream";
import { StreamHandlers } from "@/extension/services/types";
import { AnyTool } from "@/extension/types";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { FileContentPart, Message } from "@/lib/types";

/**
 * AI completion
 * tool execution and response streaming
 */

class CompletionService {
  // Main entry point: runs tool execution (if enabled) then streams response
  async create(handlers: StreamHandlers): Promise<void> {
    try {
      const { agentMode, history } = State;

      const userMessage = history[history.length - 1].content;
      console.log("[Completion]: Received message:", userMessage);

      if (agentMode && mcpManager.hasConnectedServers()) {
        const enabledTools = State.config.mcpEnabledTools;
        const tools = await mcpManager.getAllTools(enabledTools);
        if (Object.keys(tools).length > 0) {
          await this.#executeTools(tools, handlers.onToolMessage);
        }
      }

      await this.#executeStream(handlers);
    } catch (error) {
      console.error("[Completion] Error:", error);
      handlers.onError(error);
    }
  }

  // Builds model messages array with system prompt and file attachments
  async prepareMessages(): Promise<ModelMessage[]> {
    const { history, config } = State;
    const systemPrompt = config.systemPrompt || SYSTEM_PROMPT;

    const conversationMessages = await Promise.all(
      history.map((msg) => this.#toModelMessageWithFiles(msg)),
    );

    return [{ role: "system", content: systemPrompt }, ...conversationMessages];
  }

  // Runs multi-step tool execution loop via generateText
  async #executeTools(
    tools: Record<string, AnyTool>,
    onToolMessage?: (message: Message) => void,
  ): Promise<void> {
    const { config, abort, history } = State;

    const messages = await this.prepareMessages();
    const model = createModel(config);

    await generateText({
      model,
      messages,
      tools,
      stopWhen: stepCountIs(config.toolMaxRounds || 10),
      maxOutputTokens: config.maxCompletionTokens,
      temperature: config.temperature,
      abortSignal: abort.signal,
      onStepFinish: ({ toolCalls, toolResults }) => {
        if (!toolCalls || toolCalls.length === 0) return;

        const assistantMessage: Message = {
          id: `assistant-tools-${Date.now()}`,
          role: "assistant",
          content: "",
          toolCalls: toolCalls.map((tc) => ({
            id: tc.toolCallId,
            name: tc.toolName,
            arguments: JSON.stringify(tc.input),
          })),
        };
        history.push(assistantMessage);

        for (let i = 0; i < toolCalls.length; i++) {
          const toolCall = toolCalls[i];
          const toolResult = toolResults[i];

          const toolResultMessage: Message = {
            id: `tool-${Date.now()}-${toolCall.toolCallId}`,
            role: "tool",
            content: JSON.stringify(toolResult?.output ?? null),
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            toolArgs: JSON.stringify(toolCall.input),
          };
          history.push(toolResultMessage);

          if (onToolMessage) {
            onToolMessage(toolResultMessage);
          }
        }
      },
    });
  }

  // Streams the final response to the client
  async #executeStream(handlers: StreamHandlers): Promise<void> {
    const { config, abort } = State;

    const messages = await this.prepareMessages();
    const model = createModel(config);

    console.log("[Completion] Streaming response");

    const response = streamText({
      model,
      messages,
      maxOutputTokens: config.maxCompletionTokens,
      temperature: config.temperature,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      topP: config.topP,
      abortSignal: abort.signal,
    });

    await handleStream(response, handlers);
  }

  // Converts Message to AI SDK format (handles tool calls/results)
  #toModelMessage(message: Message): ModelMessage {
    // Tool result messages
    if (message.role === "tool" && message.toolCallId) {
      return {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: message.toolCallId,
            toolName: message.toolName || "",
            output: { type: "text", value: message.content || "" },
          },
        ],
      };
    }

    // Assistant messages with tool calls
    if (message.role === "assistant" && message.toolCalls?.length) {
      return {
        role: "assistant",
        content: [
          ...(message.content
            ? [{ type: "text" as const, text: message.content }]
            : []),
          ...message.toolCalls.map((tc) => ({
            type: "tool-call" as const,
            toolCallId: tc.id,
            toolName: tc.name,
            input: JSON.parse(tc.arguments),
          })),
        ],
      };
    }

    // User, assistant, system messages
    return {
      role: message.role as "user" | "assistant" | "system",
      content: message.content,
    };
  }

  // Converts Message with file attachments to multipart content
  async #toModelMessageWithFiles(message: Message): Promise<ModelMessage> {
    if (message.role === "user" && message.files?.length) {
      const fileParts = await FileReader.readFilesAsContent(message.files);
      const contentParts: FileContentPart[] = [
        { type: "text", text: message.content },
        ...fileParts,
      ];
      return { role: "user", content: contentParts };
    }

    return this.#toModelMessage(message);
  }
}

export const Completion = new CompletionService();
