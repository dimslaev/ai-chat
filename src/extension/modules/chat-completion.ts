import * as vscode from "vscode";
import { Log } from "./log";
import { App } from "./app";
import * as prompts from "../prompts";
import { getOpenAIToolDefinitions } from "../tool";
import { fileExists, readFileContent } from "../tool/utils";
import { Message, AIMessage, ToolCall } from "../../types";
import {
  postMessage,
  toOpenAIMessage,
  toGroqMessage,
} from "../../utils/message";

export namespace Chat {
  const log = Log.create({ service: "chat" });

  export function convertMessage(message: Message): AIMessage {
    const app = App.state();
    if (app.config.PROVIDER === "groq") {
      return toGroqMessage(message);
    }
    return toOpenAIMessage(message);
  }

  export async function prepareMessages(): Promise<AIMessage[]> {
    const app = App.state();
    const messages: AIMessage[] = app.history
      .slice(-app.config.HISTORY_LIMIT)
      .map(convertMessage);

    log.info("preparing messages", {
      history: messages.length,
      files: app.files.length,
    });

    // System prompt with tool configuration
    const systemPrompt = prompts.system({
      toolsEnabled: app.config.USE_TOOLS,
    });

    // Auto-load project.md if it exists
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceRoot) {
      try {
        const projectMdExists = await fileExists("project.md", workspaceRoot);
        if (projectMdExists) {
          const projectMdContent = await readFileContent(
            "project.md",
            workspaceRoot
          );

          const projectContextMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: prompts.fileContext({
              fileName: "project.md",
              content: projectMdContent,
            }),
          };

          messages.unshift(convertMessage(projectContextMessage));

          log.info("auto-loaded project.md", {
            contentLength: projectMdContent.length,
          });
        }
      } catch (error) {
        log.info("failed to load project.md", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Add attached file contents as context (legacy support)
    if (app.files.length > 0) {
      await Promise.all(
        app.files.map(async (file) => {
          const fileData = await vscode.workspace.fs.readFile(file.fileUri);
          const fileContent = Buffer.from(fileData).toString("utf8");

          const contextMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: prompts.fileContext({
              fileName: file.name,
              content: fileContent,
            }),
          };

          messages.unshift(convertMessage(contextMessage));
        })
      );
    }

    // Add system prompt
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
      const app = App.state();
      let messages = await prepareMessages();

      log.info("starting completion", {
        messages: messages.length,
        model: app.config.MODEL,
        tools: app.config.USE_TOOLS,
      });

      // Iterative tool execution if tools are enabled
      if (app.config.USE_TOOLS) {
        log.info("tools enabled, starting iterative tool execution");

        let iterationCount = 0;
        const maxIterations = 10; // Prevent infinite loops

        while (iterationCount < maxIterations) {
          log.info("tool iteration", {
            count: iterationCount + 1,
            maxIterations,
          });

          const toolResponse = await (
            app.client as any
          ).chat.completions.create({
            model: app.config.MODEL,
            messages: messages as any,
            tools: getOpenAIToolDefinitions(),
            tool_choice: "auto",
            temperature: app.config.TEMPERATURE,
          });

          const toolCalls = toolResponse.choices[0]?.message?.tool_calls;

          if (!toolCalls || toolCalls.length === 0) {
            log.info("no more tool calls, proceeding to final response");
            break;
          }

          log.info("executing tool calls", {
            count: toolCalls.length,
            iteration: iterationCount + 1,
            tools: toolCalls.map((t: ToolCall) => t.function.name),
          });

          // Execute tools
          const toolResults = await executeTools(toolCalls);

          // Add assistant message with tool calls to conversation
          messages.push({
            role: "assistant",
            content: toolResponse.choices[0]?.message?.content || null,
            tool_calls: toolCalls,
          });

          // Add tool results to conversation
          for (const result of toolResults) {
            messages.push({
              role: "tool",
              tool_call_id: result.tool_call_id,
              content: result.content,
            });
          }

          iterationCount++;

          // Check if aborted
          if (app.abort.signal.aborted) {
            log.info("tool execution aborted");
            return;
          }
        }

        if (iterationCount >= maxIterations) {
          log.warn("reached maximum tool iterations", { maxIterations });
        }
      }

      // Final streaming response (either no tools were called, or tool execution is complete)
      log.info("starting final streaming response", {
        totalMessages: messages.length,
        toolsUsed: app.config.USE_TOOLS,
      });

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
    const app = App.state();
    const results: Array<{ tool_call_id: string; content: string }> = [];

    for (const tool of tools) {
      try {
        const args = JSON.parse(tool.function.arguments);
        const toolName = tool.function.name;

        const target = getToolTarget(toolName, args);

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

  function getToolTarget(toolName: string, args: any): string {
    // File-related tools
    if (args.filePath) return args.filePath;
    if (args.pattern) return args.pattern;
    if (args.path) return args.path;

    // Tool-specific parameters
    switch (toolName) {
      case "todo_write":
        return `${args.todos?.length || 0} todos`;
      case "todo_read":
        return "current todos";
      case "get_current_context":
        return "active file context";
      case "task":
        return args.description || "planning task";
      case "analyze_user_intent":
        return "user intent analysis";
      default:
        return "unknown";
    }
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
    const app = App.state();
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
