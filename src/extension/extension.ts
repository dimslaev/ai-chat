"use strict";

import * as vscode from "vscode";
import OpenAI from "openai";
import {
  Message,
  OpenAIMessage,
  AttachedFile,
  PostMessage,
  OpenAIStream,
  ToolCall,
} from "../types";
import { postMessage, toOpenAIMessage } from "../utils/message";
import {
  DEFAULT_SYSTEM_PROMPT,
  TOOL_ENHANCED_SYSTEM_PROMPT,
  FILE_CONTEXT_PROMPT,
} from "./prompts";
import { getOpenAIToolDefinitions, ToolExecutor } from "./tool";

const extConfig = vscode.workspace.getConfiguration("aiChat");

export const Extension = {
  context: undefined! as vscode.ExtensionContext,
  webview: undefined! as vscode.Webview,

  // Single OpenAI client for both chat and tools
  client: new OpenAI({
    apiKey: extConfig.get<string>("apiKey") || "no-key",
    baseURL: extConfig.get<string>("baseURL") || "https://api.openai.com/v1",
  }),

  // Abort stream
  abort: new AbortController(),

  // Simplified configuration
  config: {
    TEMPERATURE: 0.1,
    HISTORY_LIMIT: 10,
    MODEL: extConfig.get<string>("model") || "gpt-4",
    USE_TOOLS: extConfig.get<boolean>("toolsEnabled") || false,
  },

  // Chat state
  history: [] as Message[],
  files: [] as AttachedFile[],

  // Tool executor
  executor: new ToolExecutor(),

  // Set the tools enabled state and persist it
  setToolsEnabled(enabled: boolean): void {
    this.config.USE_TOOLS = enabled;
    if (this.context) {
      this.context.globalState.update("toolsEnabled", enabled);
    }
  },

  init(context: vscode.ExtensionContext) {
    this.context = context;
    this.abort = new AbortController();

    // Set up tool executor with workspace root
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
    this.executor.setWorkspaceRoot(workspaceRoot);

    // Register webview provider
    const provider = { resolveWebviewView: this.ui.setup };
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider("ai-chat-view", provider)
    );

    // Listen for active file changes to suggest attachments
    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && this.webview) {
          postMessage(this.webview, "activeFileChanged", {
            name: editor.document.uri.path.split(/[\\/]/).pop() || "",
            fileUri: editor.document.uri,
          });
        }
      })
    );
  },

  ui: {
    setup: (webviewView: vscode.WebviewView) => {
      Extension.webview = webviewView.webview;

      Extension.webview.options = {
        enableScripts: true,
        localResourceRoots: [Extension.context.extensionUri],
      };

      Extension.webview.html = Extension.ui.getHtml();

      Extension.webview.onDidReceiveMessage((data: PostMessage) => {
        Extension.ui.handleMessage(data);
      });

      webviewView.onDidDispose(
        () => {
          Extension.abort.abort();
        },
        null,
        Extension.context.subscriptions
      );
    },

    getHtml() {
      const { context, webview } = Extension;
      const webviewUri = vscode.Uri.joinPath(
        context.extensionUri,
        "out",
        "webview.js"
      );
      const scriptUri = webview.asWebviewUri(webviewUri);

      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Chat</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/atom-one-dark.min.css">
        </head>
        <body>
            <div id="root"></div>
            <script src="${scriptUri.toString()}"></script>
        </body>
        </html>
      `;
    },

    // Route messages received from the webview
    handleMessage(data: PostMessage) {
      switch (data.type) {
        case "getState":
          this.sendState();
          break;

        case "sendMessage":
          this.handleUserMessage(data.payload);
          break;

        case "stopStream":
          this.stopStream();
          break;

        case "attachFile":
          this.attachFile(data.payload);
          break;

        case "removeAttachedFile":
          this.removeFile(data.payload);
          break;

        case "cleanup":
          this.cleanup();
          break;

        case "toggleTools":
          this.toggleTools(data.payload);
          break;
      }
    },

    // Send current state to webview since changing tab unmounts the webview
    sendState() {
      const { webview, history, files, config } = Extension;
      const { activeTextEditor } = vscode.window;
      postMessage(webview, "setState", {
        history,
        attachedFiles: files,
        suggestedFile: activeTextEditor
          ? {
              name:
                activeTextEditor.document.uri.path.split(/[\\/]/).pop() || "",
              fileUri: activeTextEditor.document.uri,
            }
          : null,
        toolsEnabled: config.USE_TOOLS,
      });
    },

    // Process user message and start AI response
    async handleUserMessage(payload: Message) {
      const { history } = Extension;
      Extension.history = [...history, payload];
      Extension.abort = new AbortController();

      // Start AI response (tools are handled within createCompletion)
      Extension.chat.createCompletion();
    },

    stopStream() {
      const { webview, abort } = Extension;
      abort.abort();
      postMessage(webview, "endAssistantMessage");
    },

    attachFile(payload: AttachedFile) {
      const { files } = Extension;
      if (!files.find((f) => f.fileUri.path === payload.fileUri.path)) {
        Extension.files = [...files, payload];
      }
    },

    removeFile(payload: AttachedFile) {
      Extension.files = Extension.files.filter(
        (f) => f.fileUri.path !== payload.fileUri.path
      );
    },

    toggleTools(enabled: boolean) {
      Extension.setToolsEnabled(enabled);
    },

    cleanup() {
      Extension.files = [];
      Extension.history = [];
    },
  },

  tools: {
    getIcon(toolName: string): string {
      const icons = {
        read_file: "📖",
        write_file: "✏️",
        grep: "🔍",
      };
      return icons[toolName as keyof typeof icons] || "🔧";
    },

    createToolMessage(toolName: string, target: string): Message {
      const icon = this.getIcon(toolName);
      const action = toolName.replace("_", " ");
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: `${icon} ${action}: \`${target}\``,
      };
    },

    async execute(
      tools: ToolCall[]
    ): Promise<Array<{ tool_call_id: string; content: string }>> {
      const { executor, history, webview, abort } = Extension;
      const results: Array<{ tool_call_id: string; content: string }> = [];

      for (const tool of tools) {
        try {
          const args = JSON.parse(tool.function.arguments);
          const toolName = tool.function.name;

          const target =
            args.filePath || args.pattern || args.path || "unknown";

          console.log(`Executing tool: ${toolName} with target: ${target}`);

          // Show tool execution to user
          const toolMessage = this.createToolMessage(toolName, target);
          history.push(toolMessage);
          postMessage(webview, "startAssistantMessage");
          postMessage(webview, "appendChunk", toolMessage.content);
          postMessage(webview, "endAssistantMessage");

          // Execute the tool
          const result = await executor.executeToolCall(
            tool.id,
            toolName,
            args,
            abort.signal
          );

          results.push(result);
        } catch (error) {
          results.push({
            tool_call_id: tool.id,
            content: `Error parsing arguments: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }

      return results;
    },
  },

  chat: {
    // Build message context
    async prepareMessages() {
      const { config, history, files } = Extension;
      const messages: OpenAIMessage[] = history
        .slice(-config.HISTORY_LIMIT)
        .map(toOpenAIMessage);

      console.log(
        `Preparing chat messages (history: ${messages.length}, files: ${files.length})`
      );

      // Add attached file contents as context
      if (files.length) {
        console.log(`Adding ${files.length} attached files as context`);

        await Promise.all(
          files.map(async (file) => {
            const fileData = await vscode.workspace.fs.readFile(file.fileUri);
            const fileContent = Buffer.from(fileData).toString("utf8");

            messages.unshift({
              role: "user",
              content: FILE_CONTEXT_PROMPT(file.name, fileContent),
            });
          })
        );
      }

      // Add system prompt (use tool-enhanced prompt if tools are enabled)
      const systemPrompt = Extension.config.USE_TOOLS
        ? TOOL_ENHANCED_SYSTEM_PROMPT
        : DEFAULT_SYSTEM_PROMPT;

      messages.unshift({
        role: "system",
        content: systemPrompt,
      });

      return messages;
    },

    async createCompletion() {
      try {
        const { client, config } = Extension;
        const messages = await this.prepareMessages();

        console.log("Creating completion with messages:", messages.length);

        // Check for tool calls first if tools are enabled
        if (config.USE_TOOLS) {
          console.log("Tools enabled, checking for tool calls");

          const toolResponse = await client.chat.completions.create({
            model: config.MODEL,
            messages,
            tools: getOpenAIToolDefinitions(),
            tool_choice: "auto",
            temperature: config.TEMPERATURE,
          });

          const toolCalls = toolResponse.choices[0]?.message?.tool_calls;

          if (toolCalls && toolCalls.length > 0) {
            console.log(`Model requested ${toolCalls.length} tool calls`);

            // Execute tools
            const toolResults = await Extension.tools.execute(toolCalls);

            // Add tool calls and results to conversation
            const updatedMessages = [...messages];
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
            const stream = await client.chat.completions.create({
              model: config.MODEL,
              messages: updatedMessages,
              stream: true,
              temperature: config.TEMPERATURE,
            });

            this.handleStream(stream);
            return;
          }
        }

        // No tools called, proceed with normal streaming
        const stream = await client.chat.completions.create({
          model: config.MODEL,
          messages,
          stream: true,
          temperature: config.TEMPERATURE,
        });

        this.handleStream(stream);
      } catch (error) {
        this.handleError(error);
      }
    },

    async handleStream(stream: OpenAIStream) {
      const { webview, history, abort } = Extension;

      try {
        postMessage(webview, "startAssistantMessage");

        let content = "";
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "",
        };

        for await (const chunk of stream) {
          if (abort.signal.aborted) {
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
          Extension.history = [...history, assistantMessage];
        }

        postMessage(webview, "endAssistantMessage");
      } catch (error) {
        this.handleError(error);
      }
    },

    handleError(err: any) {
      const { webview } = Extension;
      console.error("Chat error:", err);
      postMessage(webview, "apiError", {
        message: err?.message || "An error occurred",
      });
      postMessage(webview, "endAssistantMessage");
    },
  },
};

export function activate(context: vscode.ExtensionContext) {
  Extension.init(context);
}
