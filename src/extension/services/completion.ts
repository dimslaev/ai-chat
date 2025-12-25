import * as State from "@/extension/core/state";
import { readFiles } from "@/extension/services/file-reader";
import { handleStream, StreamHandlers } from "@/extension/services/stream";
import { executeToolCall, getEnabledTools } from "@/extension/tools";
import { TOOL_SELECTION_PROMPT } from "@/lib/prompts";
import { Message, OpenAIMessage } from "@/lib/types";
import { toOpenAIMessage } from "@/lib/utils";

export type CompletionHandlers = StreamHandlers;

export async function prepareMessages(
  systemPrompt: string,
): Promise<OpenAIMessage[]> {
  const { config, history, files } = State.get;
  const toolMessages = history.filter((it) => it.role === "tool");
  const messages: OpenAIMessage[] = history
    .slice(-(config.historyLimit + toolMessages.length))
    .map(toOpenAIMessage);

  if (files.length > 0) {
    const fileContents = await readFiles(files);
    fileContents.forEach((content: OpenAIMessage) => messages.unshift(content));
  }

  messages.unshift({
    role: "system",
    content: systemPrompt,
  });

  return messages;
}

async function executeTools(
  onToolMessage?: (message: Message) => void,
): Promise<void> {
  const { client, config, abort, history } = State.get;
  const maxRounds = config.toolMaxRounds || 10;
  const enabledTools = getEnabledTools(config);

  if (enabledTools.length === 0) return;

  console.log(
    "[Tool Phase] Enabled tools:",
    enabledTools.map((t) => (t.type === "function" ? t.function.name : t.type)),
  );

  for (let round = 0; round < maxRounds; round++) {
    const messages = await prepareMessages(TOOL_SELECTION_PROMPT);

    // Force think tool on first round, then auto
    const toolChoice =
      round === 0
        ? { type: "function" as const, function: { name: "think" } }
        : ("auto" as const);

    const response = await client.chat.completions.create(
      {
        messages,
        model: config.model,
        temperature: config.temperature,
        max_completion_tokens: config.maxCompletionTokens,
        tools: enabledTools,
        tool_choice: toolChoice,
      },
      { signal: abort.signal },
    );

    const choice = response.choices[0];
    const message = choice?.message;

    if (!message?.tool_calls || message.tool_calls.length === 0) {
      return;
    }

    // Store assistant message with tool calls in history (hidden)
    const toolCalls = message.tool_calls
      .filter((tc) => tc.type === "function")
      .map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));

    // Store tool message in history (hidden)
    const toolMessage: Message = {
      id: `tool-assistant-${Date.now()}`,
      role: "assistant",
      content: message.content || "",
      hidden: true,
      toolCalls,
    };
    history.push(toolMessage);

    // Execute all tool calls
    let taskCompleted = false;
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;

      // Handle think tool - send to UI and continue
      if (toolCall.function.name === "think") {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        console.log("[Tool Phase] Thinking:", args.thought);

        if (onToolMessage) {
          onToolMessage({
            id: `think-${Date.now()}-${toolCall.id}`,
            role: "tool",
            content: args.thought,
            toolCallId: toolCall.id,
            toolName: "think",
          });
        }
        continue;
      }

      // Check if this is the task_complete signal
      if (toolCall.function.name === "task_complete") {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        console.log("[Tool Phase] Task complete:", args.summary);
        taskCompleted = true;
        continue;
      }

      const args = JSON.parse(toolCall.function.arguments || "{}");
      const result = await executeToolCall({
        name: toolCall.function.name,
        arguments: args,
      });

      // Store tool result in history
      const toolResultMessage: Message = {
        id: `tool-result-${Date.now()}-${toolCall.id}`,
        role: "tool",
        content: JSON.stringify(result.error || result.result),
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        toolArgs: toolCall.function.arguments,
      };
      history.push(toolResultMessage);

      if (onToolMessage) {
        onToolMessage(toolResultMessage);
      }
    }

    // Exit loop if task_complete was called
    if (taskCompleted) {
      console.log("[Tool Phase] Exiting - task marked complete");
      return;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("[Tool Phase] Max rounds reached");
}

// Streaming call for final response
async function executeStream(handlers: StreamHandlers): Promise<void> {
  const { client, config, abort } = State.get;

  const messages = await prepareMessages(config.systemPrompt);

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
      stream_options: { include_usage: true },
    },
    { signal: abort.signal },
  );

  await handleStream(response, handlers);
}

export async function createCompletion(
  handlers: CompletionHandlers,
): Promise<void> {
  try {
    const { config, agentMode, history } = State.get;

    const userMessage = history[history.length - 1].content;
    console.log("[Completion]: Received message:", userMessage);

    // Phase 1: Tool execution
    if (agentMode) {
      const enabledTools = getEnabledTools(config);
      if (enabledTools.length > 0) {
        await executeTools(handlers.onToolMessage);
        console.log("[Completion] Tools complete");
      }
    }

    // Phase 2: Stream final response
    await executeStream(handlers);
  } catch (error) {
    console.error("[Completion] Error:", error);
    handlers.onError(error);
  }
}
