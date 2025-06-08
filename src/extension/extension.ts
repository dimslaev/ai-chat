"use strict";

import * as vscode from "vscode";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  Message,
  OpenAIMessage,
  AttachedFile,
  PostMessage,
  OpenAIStream,
  ToolCall,
  ToolExecutionResult,
  MessageCategory,
  ToolDefinition,
} from "../types";
import { postMessage, toOpenAIMessage } from "../utils/message";
import { getContinuationContent } from "../utils/markdown";
import {
  DEFAULT_SYSTEM_PROMPT,
  CATEGORY_SYSTEM_PROMPTS,
  FILE_CONTEXT_PROMPT,
  CLASSIFICATION_SYSTEM_PROMPT,
  TOOL_EXECUTION_SYSTEM_PROMPT,
  TOOL_RESULT_PROMPT,
} from "./prompts";
import { TOOL_DEFINITIONS, ToolExecutor, Classification } from "./tools";
import { ChatCompletionToolChoiceOption } from "openai/resources/chat";

const extConfig = vscode.workspace.getConfiguration("aiChat");

export const Extension = {
  context: undefined! as vscode.ExtensionContext,
  webview: undefined! as vscode.Webview,

  // OpenAI clients - separate for chat and tools
  client: new OpenAI({
    apiKey: extConfig.get<string>("apiKey") || "no-key",
    baseURL:
      extConfig.get<string>("baseURL") ||
      "https://internal.infomaniak.com/api/internal-ai/ide",
  }),
  toolsClient: new OpenAI({
    apiKey:
      extConfig.get<string>("toolsApiKey") ||
      extConfig.get<string>("apiKey") ||
      "no-key",
    baseURL:
      extConfig.get<string>("toolsBaseURL") || "https://api.openai.com/v1",
  }),

  // Abort stream
  abort: new AbortController(),

  // Configuration settings
  config: {
    MAX_TOKENS: 512,
    TEMPERATURE: 0.1,
    HISTORY_LIMIT: 10,
    MODEL: extConfig.get<string>("model") || "llama3",
    TOOLS_MODEL: extConfig.get<string>("toolsModel") || "gpt-4o-mini",
    TOOLS_TEMPERATURE: 0.0,
    USE_TOOLS: extConfig.get<boolean>("toolsEnabled") || false,
  },

  // Chat state
  history: [] as Message[],
  files: [] as AttachedFile[],
  partialMessage: "", // For handling long responses that get cut off

  // Tools calling
  executor: new ToolExecutor(),
  category: null as MessageCategory | null, // Current conversation category

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
      const {
        history,
        chat: { createCompletion },
        tools,
      } = Extension;
      Extension.history = [...history, payload];
      Extension.abort = new AbortController();

      // Get tool context if tools are enabled
      const toolContext = await tools.prepareContext(payload);
      console.log("Prepared tool context", toolContext);
      createCompletion(toolContext);
    },

    stopStream() {
      const { webview, abort } = Extension;
      abort.abort();
      postMessage(webview, "endAssistantMessage");
    },

    attachFile(payload: AttachedFile) {
      const { fileUri } = payload;
      Extension.files.push({
        name: fileUri.path.split(/[\\/]/).pop() || "",
        fileUri,
      });
    },

    removeFile(payload: AttachedFile) {
      const { files } = Extension;
      const index = files.findIndex(
        (file) => file.fileUri.path === payload.fileUri.path
      );
      files.splice(index, 1);
    },

    toggleTools(enabled: boolean) {
      Extension.setToolsEnabled(enabled);
    },

    cleanup() {
      Extension.history = [];
      Extension.files = [];
      Extension.category = null;
    },
  },

  tools: {
    getIcon(toolName: string): string {
      const icons = {
        search_files: "🔍",
        read_file: "📖",
        write_file: "✏️",
        list_directory: "📁",
        get_file_info: "ℹ️",
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

    async execute(tools: ToolCall[]): Promise<ToolExecutionResult[]> {
      const { executor, history, webview } = Extension;
      const results: ToolExecutionResult[] = [];

      for (const tool of tools) {
        try {
          const args = JSON.parse(tool.function.arguments);
          const toolName = tool.function.name;

          const target =
            args.file_path ||
            args.directory_path ||
            args.pattern ||
            args.category ||
            "unknown";

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
            args
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

    async getToolCalls(
      messages: OpenAIMessage[],
      tools: ToolDefinition[],
      toolChoice: ChatCompletionToolChoiceOption = "auto"
    ): Promise<ToolCall[]> {
      const { config, toolsClient } = Extension;

      const response = await toolsClient.chat.completions.create({
        model: config.TOOLS_MODEL,
        messages: messages,
        tools: tools,
        tool_choice: toolChoice,
        temperature: config.TOOLS_TEMPERATURE,
      });

      return response.choices[0]?.message?.tool_calls || [];
    },

    // Analyze user message and prepare tool context
    async prepareContext(userMessage: Message): Promise<OpenAIMessage[]> {
      const { config, toolsClient, files } = Extension;

      if (!config.USE_TOOLS) {
        return [];
      }

      try {
        // Phase 1: Classification
        console.log("Classification...");
        const messages: OpenAIMessage[] = [
          { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
          { role: "user", content: userMessage.content },
        ];
        if (files.length) {
          console.log(`Adding ${files.length} attached files as context`);
          await Promise.all(
            files.map(async (file) => {
              const fileData = await vscode.workspace.fs.readFile(file.fileUri);
              const fileContent = Buffer.from(fileData).toString("utf8");

              messages.push({
                role: "user",
                content: FILE_CONTEXT_PROMPT(file.name, fileContent),
              });
            })
          );
        }
        const classification = await toolsClient.beta.chat.completions.parse({
          model: config.TOOLS_MODEL,
          messages,
          response_format: zodResponseFormat(Classification, "classification"),
          temperature: config.TOOLS_TEMPERATURE,
        });
        const parsed = classification.choices[0]?.message?.parsed;
        Extension.category = parsed?.category || "general";
        console.log("Classification result", parsed);

        // Phase 2: Tool execution
        const toolCalls = await this.getToolCalls(
          [
            { role: "system", content: TOOL_EXECUTION_SYSTEM_PROMPT },
            { role: "user", content: userMessage.content },
          ],
          TOOL_DEFINITIONS
        );

        if (!toolCalls.length) {
          return [];
        }

        const toolResults = await this.execute(toolCalls);

        const contextMessages: OpenAIMessage[] = [];
        for (const result of toolResults) {
          const toolCall = toolCalls.find(
            (tc) => tc.id === result.tool_call_id
          );

          contextMessages.push({
            role: "user",
            content: TOOL_RESULT_PROMPT(
              toolCall?.function.name || "unknown",
              result.content
            ),
          });
        }

        return contextMessages;
      } catch (error) {
        console.error("Tool execution error:", error);
        return [];
      }
    },
  },

  chat: {
    // Build message context selectively
    async prepareMessages(toolContext: OpenAIMessage[] = []) {
      const { config, history, partialMessage, files, category } = Extension;
      const messages: OpenAIMessage[] = history
        .slice(-config.HISTORY_LIMIT)
        .map(toOpenAIMessage);

      console.log(
        `Preparing chat messages (history: ${messages.length}, files: ${files.length}, tools context: ${toolContext.length})`
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

      // Add tool results if any
      if (toolContext.length > 0) {
        console.log(
          `Adding ${toolContext.length} tool results as context`,
          toolContext
        );
        messages.unshift(...toolContext);
      }

      // Use category-specific system prompt
      const systemPrompt = category
        ? CATEGORY_SYSTEM_PROMPTS[category]
        : DEFAULT_SYSTEM_PROMPT;

      console.log(`Using system prompt for category: ${category}`);

      messages.unshift({ role: "system", content: systemPrompt });

      // Continue partial message if response was cut off
      if (partialMessage) {
        console.log(
          `Continuing partial message (${partialMessage.length} chars)`
        );
        messages.push({
          role: "assistant",
          content: partialMessage,
        });
      }

      return messages;
    },

    // Create streaming completion from OpenAI
    async createCompletion(toolContext: OpenAIMessage[] = []) {
      const {
        client,
        config,
        abort,
        chat: { prepareMessages, handleStream },
        util: { handleError },
      } = Extension;

      console.log(`Starting main model completion (model: ${config.MODEL})`);

      const messages = await prepareMessages(toolContext);

      console.log(`Sending ${messages.length} messages to main model`);

      try {
        const response = await client.chat.completions.create(
          {
            messages,
            model: config.MODEL,
            temperature: config.TEMPERATURE,
            max_completion_tokens: config.MAX_TOKENS,
            stream: true,
          },
          { signal: abort.signal }
        );

        console.log(`Received streaming response from main model`);
        await handleStream(response, toolContext);
      } catch (err) {
        console.error(`Main model request failed:`, err);
        handleError(err);
      }
    },

    // Process streaming response and handle continuation
    async handleStream(
      stream: OpenAIStream,
      toolContext: OpenAIMessage[] = []
    ) {
      const {
        webview,
        chat: { createCompletion },
        history,
        abort,
        partialMessage,
        util: { handleError },
      } = Extension;

      let reply = partialMessage || "";
      let isFirstChunkOfContinuation = !!partialMessage;

      if (!partialMessage) {
        postMessage(webview, "startAssistantMessage");
      }

      try {
        for await (const chunk of stream) {
          if (abort.signal.aborted) {
            throw new Error("Request aborted");
          }

          const text = chunk.choices[0]?.delta?.content || "";

          // Fix continuation issues for the first chunk of a continued stream
          let processedText = text;
          if (isFirstChunkOfContinuation && partialMessage) {
            processedText = getContinuationContent(partialMessage, text);
            isFirstChunkOfContinuation = false;
          }

          reply += processedText;
          postMessage(webview, "appendChunk", processedText);

          const finishReason = chunk.choices[0]?.finish_reason;
          if (finishReason === "length") {
            // Response was cut off, continue in next request
            Extension.partialMessage = reply;
          }
          if (finishReason === "stop") {
            Extension.partialMessage = "";
          }
        }

        if (!Extension.partialMessage) {
          // Response complete, add to history
          postMessage(webview, "endAssistantMessage");
          history.push({
            id: Date.now().toString(),
            role: "assistant",
            content: reply,
          });
        } else {
          // Resend the messages including last partial message for continuation
          createCompletion(toolContext);
        }
      } catch (error) {
        Extension.partialMessage = "";
        postMessage(webview, "endAssistantMessage");
        if (!abort.signal.aborted) {
          handleError(error);
        }
      }
    },
  },

  util: {
    // Send error info to webview for user display
    handleError(err: any) {
      const { webview } = Extension;
      const message =
        typeof err === "string"
          ? err
          : typeof err === "object" && "message" in err
          ? err.message
          : "";
      const code = typeof err === "object" && "code" in err ? err.code : "";
      const payload = message || code ? { message, code } : null;
      postMessage(webview, "apiError", payload);
    },
  },
};

export function activate(context: vscode.ExtensionContext) {
  Extension.init(context);
}
