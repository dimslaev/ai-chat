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

// Constants
const CONSTANTS = {
  MAX_TOOL_ITERATIONS: 10,
  PROJECT_MD_FILENAME: "project.md",
  TOOL_ICONS: {
    read_file: "📖",
    write_file: "✏️",
    grep: "🔍",
    list_dir: "📁",
    analyze_ast: "🔬",
    todo_write: "📝",
    todo_read: "📋",
    get_current_context: "📍",
    task: "📋",
    analyze_user_intent: "🎯",
    discover_related_files: "🔗",
  } as const,
} as const;

// Types
interface ToolExecutionResult {
  tool_call_id: string;
  content: string;
}

interface StreamChunk {
  choices: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

interface APIResponse {
  choices: Array<{
    message?: {
      content?: string | null;
      tool_calls?: ToolCall[];
    };
  }>;
}

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

    const systemPrompt = prompts.system({
      toolsEnabled: app.config.USE_TOOLS,
    });

    // Auto-load project.md if it exists
    await loadProjectContext(messages);

    // Add attached file contents as context (legacy support)
    await loadAttachedFilesContext(messages);

    // Add system prompt
    const systemMessage: Message = {
      id: generateMessageId(),
      role: "system",
      content: systemPrompt,
    };

    messages.unshift(convertMessage(systemMessage));

    return messages;
  }

  async function loadProjectContext(messages: AIMessage[]): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    try {
      const projectMdExists = await fileExists(
        CONSTANTS.PROJECT_MD_FILENAME,
        workspaceRoot
      );
      if (!projectMdExists) return;

      const projectMdContent = await readFileContent(
        CONSTANTS.PROJECT_MD_FILENAME,
        workspaceRoot
      );

      const projectContextMessage: Message = {
        id: generateMessageId(),
        role: "user",
        content: prompts.fileContext({
          fileName: CONSTANTS.PROJECT_MD_FILENAME,
          content: projectMdContent,
        }),
      };

      messages.unshift(convertMessage(projectContextMessage));

      log.info("auto-loaded project.md", {
        contentLength: projectMdContent.length,
      });
    } catch (error) {
      log.info("failed to load project.md", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function loadAttachedFilesContext(
    messages: AIMessage[]
  ): Promise<void> {
    const app = App.state();
    if (app.files.length === 0) return;

    try {
      await Promise.all(
        app.files.map(async (file) => {
          try {
            const fileData = await vscode.workspace.fs.readFile(file.fileUri);
            const fileContent = Buffer.from(fileData).toString("utf8");

            const contextMessage: Message = {
              id: generateMessageId(),
              role: "user",
              content: prompts.fileContext({
                fileName: file.name,
                content: fileContent,
              }),
            };

            messages.unshift(convertMessage(contextMessage));
          } catch (error) {
            log.warn("failed to load attached file", {
              fileName: file.name,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );
    } catch (error) {
      log.error("failed to load attached files context", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  export async function createCompletion(): Promise<void> {
    const app = App.state();

    try {
      let messages = await prepareMessages();

      log.info("starting completion", {
        messages: messages.length,
        model: app.config.MODEL,
        tools: app.config.USE_TOOLS,
      });

      // Execute tools iteratively if enabled
      if (app.config.USE_TOOLS) {
        messages = await executeToolsIteratively(messages);

        // Check if aborted during tool execution
        if (app.abort.signal.aborted) {
          log.info("completion aborted during tool execution");
          return;
        }
      }

      // Final streaming response
      await generateFinalResponse(messages);
    } catch (error) {
      handleError(error);
    }
  }

  async function executeToolsIteratively(
    messages: AIMessage[]
  ): Promise<AIMessage[]> {
    const app = App.state();
    log.info("tools enabled, starting iterative tool execution");

    let iterationCount = 0;

    while (iterationCount < CONSTANTS.MAX_TOOL_ITERATIONS) {
      if (app.abort.signal.aborted) {
        log.info("tool execution aborted");
        break;
      }

      log.info("tool iteration", {
        count: iterationCount + 1,
        maxIterations: CONSTANTS.MAX_TOOL_ITERATIONS,
      });

      const toolResponse = await createChatCompletion(messages, {
        tools: getOpenAIToolDefinitions(),
        tool_choice: "auto",
      });

      const toolCalls = extractToolCalls(toolResponse);

      if (!toolCalls || toolCalls.length === 0) {
        log.info("no more tool calls, proceeding to final response");
        break;
      }

      log.info("executing tool calls", {
        count: toolCalls.length,
        iteration: iterationCount + 1,
        tools: toolCalls.map((t) => t.function.name),
      });

      // Execute tools and update conversation
      const toolResults = await executeTools(toolCalls);
      messages = updateMessagesWithToolResults(
        messages,
        toolResponse,
        toolCalls,
        toolResults
      );

      iterationCount++;
    }

    if (iterationCount >= CONSTANTS.MAX_TOOL_ITERATIONS) {
      log.warn("reached maximum tool iterations", {
        maxIterations: CONSTANTS.MAX_TOOL_ITERATIONS,
      });
    }

    return messages;
  }

  async function createChatCompletion(
    messages: AIMessage[],
    options: { tools?: any; tool_choice?: string; stream?: boolean } = {}
  ): Promise<APIResponse> {
    const app = App.state();

    return await (app.client as any).chat.completions.create({
      model: app.config.MODEL,
      messages: messages,
      temperature: app.config.TEMPERATURE,
      ...options,
    });
  }

  function extractToolCalls(response: APIResponse): ToolCall[] | null {
    return response.choices[0]?.message?.tool_calls || null;
  }

  function updateMessagesWithToolResults(
    messages: AIMessage[],
    toolResponse: APIResponse,
    toolCalls: ToolCall[],
    toolResults: ToolExecutionResult[]
  ): AIMessage[] {
    // Add assistant message with tool calls
    messages.push({
      role: "assistant",
      content: toolResponse.choices[0]?.message?.content || null,
      tool_calls: toolCalls,
    });

    // Add tool results
    for (const result of toolResults) {
      messages.push({
        role: "tool",
        tool_call_id: result.tool_call_id,
        content: result.content,
      });
    }

    return messages;
  }

  async function generateFinalResponse(messages: AIMessage[]): Promise<void> {
    const app = App.state();

    log.info("starting final streaming response", {
      totalMessages: messages.length,
      toolsUsed: app.config.USE_TOOLS,
    });

    const stream = await createChatCompletion(messages, { stream: true });
    await handleStream(stream);
  }

  async function executeTools(
    tools: ToolCall[]
  ): Promise<ToolExecutionResult[]> {
    const app = App.state();
    const results: ToolExecutionResult[] = [];

    for (const tool of tools) {
      if (app.abort.signal.aborted) {
        log.info("tool execution aborted");
        break;
      }

      try {
        const result = await executeSingleTool(tool);
        results.push(result);
      } catch (error) {
        log.error("tool execution failed", {
          toolId: tool.id,
          toolName: tool.function.name,
          error: error instanceof Error ? error.message : String(error),
        });

        results.push({
          tool_call_id: tool.id,
          content: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    return results;
  }

  async function executeSingleTool(
    tool: ToolCall
  ): Promise<ToolExecutionResult> {
    const app = App.state();

    let args: any;
    try {
      args = JSON.parse(tool.function.arguments);
    } catch (error) {
      throw new Error(
        `Invalid tool arguments: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const toolName = tool.function.name;
    const target = getToolTarget(toolName, args);

    log.info("executing tool", { name: toolName, target });

    // Show tool execution to user
    await displayToolExecution(toolName, target);

    // Execute the tool
    const result = await app.executor.executeToolCall(
      tool.id,
      toolName,
      args,
      app.abort.signal
    );

    return result;
  }

  async function displayToolExecution(
    toolName: string,
    target: string
  ): Promise<void> {
    const toolMessage = createToolMessage(toolName, target);
    App.addMessage(toolMessage);

    const webview = App.webview();
    postMessage(webview, "startAssistantMessage");
    postMessage(webview, "appendChunk", toolMessage.content);
    postMessage(webview, "endAssistantMessage");
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
      case "discover_related_files":
        return args.filePath ? `related to ${args.filePath}` : "related files";
      default:
        return "unknown";
    }
  }

  function createToolMessage(toolName: string, target: string): Message {
    const icon =
      CONSTANTS.TOOL_ICONS[toolName as keyof typeof CONSTANTS.TOOL_ICONS] ||
      "🔧";
    const action = toolName.replace(/_/g, " ");

    return {
      id: generateMessageId(),
      role: "assistant",
      content: `${icon} ${action}: \`${target}\``,
    };
  }

  async function handleStream(stream: any): Promise<void> {
    const app = App.state();
    const webview = App.webview();

    try {
      postMessage(webview, "startAssistantMessage");

      let content = "";
      const assistantMessage: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
      };

      for await (const chunk of stream) {
        if (app.abort.signal.aborted) {
          log.info("stream aborted");
          break;
        }

        const delta = extractDeltaContent(chunk);
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

  function extractDeltaContent(chunk: StreamChunk): string {
    return chunk.choices[0]?.delta?.content || "";
  }

  function handleError(err: any): void {
    const webview = App.webview();
    const errorMessage = err?.message || "An error occurred";

    log.error("chat error", { error: errorMessage });

    postMessage(webview, "apiError", {
      message: errorMessage,
    });
    postMessage(webview, "endAssistantMessage");
  }

  function generateMessageId(): string {
    return Date.now().toString();
  }
}
