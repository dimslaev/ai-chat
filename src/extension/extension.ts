"use strict";

import * as vscode from "vscode";
import OpenAI from "openai";
import {
  Message,
  OpenAIMessage,
  AttachedFile,
  PostMessage,
  OpenAIStream,
  MessageCategory,
} from "../types";
import { postMessage, toOpenAIMessage } from "../utils/message";
import {
  DEFAULT_SYSTEM_PROMPT,
  CATEGORY_SYSTEM_PROMPTS,
  FILE_CONTEXT_PROMPT,
} from "./prompts";

export const Extension = {
  context: undefined! as vscode.ExtensionContext,
  webview: undefined! as vscode.Webview,

  // OpenAI clients - separate for chat and tools
  client: new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "no-key",
    baseURL:
      process.env.OPENAI_BASE_URL ||
      "https://internal.infomaniak.com/api/internal-ai/ide",
  }),

  // Abort stream
  abort: new AbortController(),

  // Configuration settings
  config: {
    MAX_TOKENS: 8000,
    TEMPERATURE: 0.1,
    HISTORY_LIMIT: 10,
    MODEL: process.env.OPENAI_MODEL || "llama3",
  },

  // Chat state
  history: [] as Message[],
  files: [] as AttachedFile[],
  category: null as MessageCategory | null,

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
      });
    },

    // Process user message and start AI response
    async handleUserMessage(payload: Message) {
      const {
        history,
        chat: { createCompletion },
      } = Extension;
      Extension.history = [...history, payload];
      Extension.abort = new AbortController();
      createCompletion();
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

    cleanup() {
      Extension.history = [];
      Extension.files = [];
      Extension.category = null;
    },
  },

  chat: {
    // Build message context selectively
    async prepareMessages() {
      const { config, history, files, category } = Extension;
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

      // Use category-specific system prompt
      const systemPrompt = category
        ? CATEGORY_SYSTEM_PROMPTS[category]
        : DEFAULT_SYSTEM_PROMPT;

      console.log(`Using system prompt for category: ${category}`);

      messages.unshift({ role: "system", content: systemPrompt });

      return messages;
    },

    // Create streaming completion from OpenAI
    async createCompletion() {
      const {
        client,
        config,
        abort,
        chat: { prepareMessages, handleStream },
        util: { handleError },
      } = Extension;

      console.log(`Starting main model completion (model: ${config.MODEL})`);

      const messages = await prepareMessages();

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
        await handleStream(response);
      } catch (err) {
        console.error(`Main model request failed:`, err);
        handleError(err);
      }
    },

    // Process streaming response and handle continuation
    async handleStream(stream: OpenAIStream) {
      const {
        webview,
        chat: { createCompletion },
        history,
        abort,
        util: { handleError },
      } = Extension;

      let reply = "";

      postMessage(webview, "startAssistantMessage");

      try {
        for await (const chunk of stream) {
          if (abort.signal.aborted) {
            throw new Error("Request aborted");
          }

          const text = chunk.choices[0]?.delta?.content || "";

          // Fix continuation issues for the first chunk of a continued stream
          let processedText = text;

          reply += processedText;
          postMessage(webview, "appendChunk", processedText);
        }

        postMessage(webview, "endAssistantMessage");
        history.push({
          id: Date.now().toString(),
          role: "assistant",
          content: reply,
        });
      } catch (error) {
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
