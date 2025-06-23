import * as vscode from "vscode";
import { Log } from "../util/log";
import { App } from "../app/app";
import {
  postMessage,
  toOpenAIMessage,
  toGroqMessage,
} from "../../utils/message";
import { getOpenAIToolDefinitions } from "../tool";
import {
  DEFAULT_SYSTEM_PROMPT,
  TOOL_ENHANCED_SYSTEM_PROMPT,
  FILE_CONTEXT_PROMPT,
} from "../prompts";
import { Message, AIMessage, ToolCall } from "../../types";

export namespace Chat {
  const log = Log.create({ service: "chat" });

  export function convertMessage(message: Message): AIMessage {
    const app = App.info();
    if (app.config.PROVIDER === "groq") {
      return toGroqMessage(message);
    }
    return toOpenAIMessage(message);
  }

  export async function prepareMessages(): Promise<AIMessage[]> {
    const app = App.info();
    const messages: AIMessage[] = app.history
      .slice(-app.config.HISTORY_LIMIT)
      .map(convertMessage);

    log.info("preparing messages", {
      history: messages.length,
      files: app.files.length,
    });

    // Add attached file contents as context
    if (app.files.length > 0) {
      await Promise.all(
        app.files.map(async (file) => {
          const fileData = await vscode.workspace.fs.readFile(file.fileUri);
          const fileContent = Buffer.from(fileData).toString("utf8");

          const contextMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: FILE_CONTEXT_PROMPT(file.name, fileContent),
          };

          messages.unshift(convertMessage(contextMessage));
        })
      );
    }

    // Add system prompt (use tool-enhanced prompt if tools are enabled)
    const systemPrompt = app.config.USE_TOOLS
      ? TOOL_ENHANCED_SYSTEM_PROMPT
      : DEFAULT_SYSTEM_PROMPT;

    const systemMessage: Message = {
      id: Date.now().toString(),
      role: "system",
      content: systemPrompt,
    };

    messages.unshift(convertMessage(systemMessage));

    return messages;
  }

  export async function createCompletion() {
    try {
      const app = App.info();
      const messages = await prepareMessages();

      log.info("starting completion", {
        messages: messages.length,
        model: app.config.MODEL,
        tools: app.config.USE_TOOLS,
      });

      // Check for tool calls first if tools are enabled
      if (app.config.USE_TOOLS) {
        log.info("tools enabled, checking for tool calls");

        const toolResponse = await (app.client as any).chat.completions.create({
          model: app.config.MODEL,
          messages: messages as any,
          tools: getOpenAIToolDefinitions(),
          tool_choice: "auto",
          temperature: app.config.TEMPERATURE,
        });

        const toolCalls = toolResponse.choices[0]?.message?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          log.info("executing tool calls", { count: toolCalls.length });

          // Execute tools
          const toolResults = await executeTools(toolCalls);

          // Add tool calls and results to conversation
          const updatedMessages = [...messages] as any[];
          updatedMessages.push({
            role: "assistant",
            content: toolResponse.choices[0]?.message?.content || null,
            tool_calls: toolCalls,
          });

          for (const result of toolResults) {
            updatedMessages.push({
              role: "tool",
              tool_call_id: result.tool_call_id,
              content: result.content,
            });
          }

          // Continue with streaming response after tool execution
          const stream = await (app.client as any).chat.completions.create({
            model: app.config.MODEL,
            messages: updatedMessages,
            stream: true,
            temperature: app.config.TEMPERATURE,
          });

          handleStream(stream);
          return;
        }
      }

      // No tools called, proceed with normal streaming
      const stream = await (app.client as any).chat.completions.create({
        model: app.config.MODEL,
        messages: messages as any,
        stream: true,
        temperature: app.config.TEMPERATURE,
      });

      handleStream(stream);
    } catch (error) {
      handleError(error);
    }
  }

  async function executeTools(
    tools: ToolCall[]
  ): Promise<Array<{ tool_call_id: string; content: string }>> {
    const app = App.info();
    const results: Array<{ tool_call_id: string; content: string }> = [];

    for (const tool of tools) {
      try {
        const args = JSON.parse(tool.function.arguments);
        const toolName = tool.function.name;

        const target = args.filePath || args.pattern || args.path || "unknown";

        log.info("executing tool", { name: toolName, target });

        // Show tool execution to user
        const toolMessage = createToolMessage(toolName, target);
        App.addMessage(toolMessage);

        const webview = App.webview();
        postMessage(webview, "startAssistantMessage");
        postMessage(webview, "appendChunk", toolMessage.content);
        postMessage(webview, "endAssistantMessage");

        // Execute the tool
        const result = await app.executor.executeToolCall(
          tool.id,
          toolName,
          args,
          app.abort.signal
        );

        results.push(result);
      } catch (error) {
        log.error("tool execution failed", {
          toolId: tool.id,
          error: error instanceof Error ? error.message : String(error),
        });

        results.push({
          tool_call_id: tool.id,
          content: `Error parsing arguments: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    return results;
  }

  function createToolMessage(toolName: string, target: string): Message {
    const icons = {
      read_file: "📖",
      write_file: "✏️",
      grep: "🔍",
    };

    const icon = icons[toolName as keyof typeof icons] || "🔧";
    const action = toolName.replace("_", " ");

    return {
      id: Date.now().toString(),
      role: "assistant",
      content: `${icon} ${action}: \`${target}\``,
    };
  }

  async function handleStream(stream: any) {
    const app = App.info();
    const webview = App.webview();

    try {
      postMessage(webview, "startAssistantMessage");

      let content = "";
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "",
      };

      for await (const chunk of stream) {
        if (app.abort.signal.aborted) {
          log.info("stream aborted");
          break;
        }

        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          content += delta;
          assistantMessage.content = content;
          postMessage(webview, "appendChunk", delta);
        }
      }

      // Add complete message to history
      if (assistantMessage.content.trim()) {
        App.addMessage(assistantMessage);
      }

      postMessage(webview, "endAssistantMessage");
      log.info("stream completed", { length: content.length });
    } catch (error) {
      handleError(error);
    }
  }

  function handleError(err: any) {
    const webview = App.webview();
    log.error("chat error", { error: err?.message || String(err) });

    postMessage(webview, "apiError", {
      message: err?.message || "An error occurred",
    });
    postMessage(webview, "endAssistantMessage");
  }
}
