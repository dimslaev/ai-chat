import { generateText, ModelMessage, stepCountIs, streamText, Tool } from "ai";

import { createModel } from "@/extension/core/providers";
import * as State from "@/extension/core/state";
import { mcpManager } from "@/extension/mcp/manager";
import { readFilesAsContent } from "@/extension/services/file-reader";
import { handleStream, StreamHandlers } from "@/extension/services/stream";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { FileContentPart, Message } from "@/lib/types";

type AnyTool = Tool<any, any>;

async function getTools(): Promise<Record<string, AnyTool>> {
  if (mcpManager.hasConnectedServers()) {
    const { config } = State.get;
    const enabledTools = config.mcpEnabledTools;
    const mcpTools = await mcpManager.getAllTools(enabledTools);
    console.log("[Tools] Using MCP tools:", Object.keys(mcpTools));
    return mcpTools;
  }
  return {};
}

function toModelMessage(message: Message): ModelMessage {
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

async function toModelMessageWithFiles(
  message: Message,
): Promise<ModelMessage> {
  if (message.role === "user" && message.files?.length) {
    const fileParts = await readFilesAsContent(message.files);
    const contentParts: FileContentPart[] = [
      { type: "text", text: message.content },
      ...fileParts,
    ];
    return { role: "user", content: contentParts };
  }

  // All other messages use sync conversion
  return toModelMessage(message);
}

export async function prepareMessages(): Promise<ModelMessage[]> {
  const { history, config } = State.get;

  const systemPrompt = config.systemPrompt || SYSTEM_PROMPT;

  // Convert all messages, handling files async
  const conversationMessages = await Promise.all(
    history.map(toModelMessageWithFiles),
  );

  return [{ role: "system", content: systemPrompt }, ...conversationMessages];
}

async function executeTools(
  onToolMessage?: (message: Message) => void,
): Promise<void> {
  const { config, abort, history } = State.get;
  const enabledTools = await getTools();

  if (Object.keys(enabledTools).length === 0) return;

  console.log("[Tool Phase] Enabled tools:", Object.keys(enabledTools));

  const messages = await prepareMessages();
  const model = createModel(config);

  await generateText({
    model,
    messages,
    tools: enabledTools,
    stopWhen: stepCountIs(config.toolMaxRounds || 10),
    maxOutputTokens: config.maxCompletionTokens,
    temperature: config.temperature,
    abortSignal: abort.signal,
    onStepFinish: ({ toolCalls, toolResults }) => {
      if (!toolCalls || toolCalls.length === 0) return;

      // Add assistant message with tool calls
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

      // Add tool result messages
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

// Streaming call for final response
async function executeStream(handlers: StreamHandlers): Promise<void> {
  const { config, abort } = State.get;

  const messages = await prepareMessages();
  const model = createModel(config);

  console.log("[Stream phase]", messages);

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

export async function createCompletion(
  handlers: StreamHandlers,
): Promise<void> {
  try {
    const { config, agentMode, history } = State.get;

    const userMessage = history[history.length - 1].content;
    console.log("[Completion]: Received message:", userMessage);

    // Phase 1: Tool execution (if agent mode enabled)
    if (agentMode) {
      const enabledTools = await getTools();
      if (Object.keys(enabledTools).length > 0) {
        await executeTools(handlers.onToolMessage);
      }
    }

    // Phase 2: Stream final response
    await executeStream(handlers);
  } catch (error) {
    console.error("[Completion] Error:", error);
    handlers.onError(error);
  }
}
