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
  Configuration,
} from "../types";
import { postMessage, toOpenAIMessage } from "../utils/message";
import {
  DEFAULT_SYSTEM_PROMPT,
  CATEGORY_SYSTEM_PROMPTS,
  FILE_CONTEXT_PROMPT,
} from "./prompts";

const DEFAULT_CONFIG: Configuration = {
  id: "",
  name: "",
  active: false,
  apiKey: "",
  baseUrl: "",
  model: "",
  maxTokens: 8000,
  temperature: 0.1,
  historyLimit: 10,
} as const;

export const Extension = {
  context: undefined! as vscode.ExtensionContext,
  webview: undefined! as vscode.Webview,
  client: new OpenAI({
    apiKey: "no-key",
    baseURL: DEFAULT_CONFIG.baseUrl,
  }),
  abort: new AbortController(),
  configs: [] as Configuration[],
  config: { ...DEFAULT_CONFIG },

  // Chat state
  history: [] as Message[],
  files: [] as AttachedFile[],
  category: null as MessageCategory | null,

  init(context: vscode.ExtensionContext) {
    this.context = context;
    this.abort = new AbortController();

    this.loadConfigs()
      .then(() => {
        this.registerWebviewProvider();
        this.registerFileChangeListener();
      })
      .catch((error) => {
        console.error("Failed to initialize extension:", error);
        vscode.window.showErrorMessage(
          "AI Chat extension failed to initialize"
        );
      });
  },

  registerWebviewProvider() {
    const provider = { resolveWebviewView: this.ui.setup };
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider("ai-chat-view", provider)
    );
  },

  registerFileChangeListener() {
    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && this.webview) {
          const fileName = Extension.util.getFileName(editor.document.uri.path);
          postMessage(this.webview, "activeFileChanged", {
            name: fileName,
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

    handleMessage(data: PostMessage) {
      try {
        switch (data.type) {
          case "getState":
            this.sendState();
            break;
          case "sendMessage":
            this.handleUserMessage(data.payload);
            break;
          case "editMessage":
            this.handleEditMessage(data.payload);
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
          case "saveConfigs":
            Extension.saveConfigs(data.payload);
            break;
          case "getConfigs":
            Extension.sendConfigurations();
            break;
          default:
            console.warn(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error(`Error handling message ${data.type}:`, error);
        Extension.util.handleError(error);
      }
    },

    // Send current state to webview since changing tab unmounts the webview
    sendState() {
      const { webview, history, files, configs } = Extension;
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
        configs,
      });
    },

    // Process user message and start AI response
    async handleUserMessage(payload: Message) {
      const { history } = Extension;
      Extension.history = [...history, payload];
      Extension.abort = new AbortController();
      Extension.chat.createCompletion();
    },

    async handleEditMessage(payload: { id: string; content: string }) {
      const { history } = Extension;
      const messageIndex = history.findIndex((msg) => msg.id === payload.id);

      if (messageIndex === -1) return;

      const updatedHistory = [...history];
      updatedHistory[messageIndex] = {
        ...updatedHistory[messageIndex],
        content: payload.content,
      };

      Extension.history = updatedHistory.slice(0, messageIndex + 1);
      Extension.abort = new AbortController();
      Extension.chat.createCompletion();
    },

    stopStream() {
      const { webview, abort } = Extension;
      abort.abort();
      postMessage(webview, "endAssistantMessage");
    },

    attachFile(payload: AttachedFile) {
      const { fileUri } = payload;
      const fileName = Extension.util.getFileName(fileUri.path);

      if (!Extension.files.some((f) => f.fileUri.path === fileUri.path)) {
        Extension.files.push({ name: fileName, fileUri });
      }
    },

    removeFile(payload: AttachedFile) {
      const { files } = Extension;
      const index = files.findIndex(
        (file) => file.fileUri.path === payload.fileUri.path
      );
      if (index !== -1) {
        files.splice(index, 1);
      }
    },

    cleanup() {
      Extension.history = [];
      Extension.files = [];
      Extension.category = null;
    },
  },

  chat: {
    async prepareMessages(): Promise<OpenAIMessage[]> {
      const { config, history, files, category } = Extension;
      const messages: OpenAIMessage[] = history
        .slice(-config.historyLimit)
        .map(toOpenAIMessage);

      console.log(
        `Preparing messages (history: ${messages.length}, files: ${files.length})`
      );

      // Add file contents as context
      if (files.length > 0) {
        const fileContents = await this.loadFileContents(files);
        fileContents.forEach((content) => messages.unshift(content));
      }

      // Add system prompt
      const systemPrompt = this.getSystemPrompt(category);
      messages.unshift({ role: "system", content: systemPrompt });

      return messages;
    },

    async loadFileContents(files: AttachedFile[]): Promise<OpenAIMessage[]> {
      const fileMessages: OpenAIMessage[] = [];

      const results = await Promise.allSettled(
        files.map(async (file) => {
          const fileData = await vscode.workspace.fs.readFile(file.fileUri);
          const fileContent = Buffer.from(fileData).toString("utf8");
          return {
            role: "user" as const,
            content: FILE_CONTEXT_PROMPT(file.name, fileContent),
          };
        })
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          fileMessages.push(result.value);
        } else {
          console.error(
            `Failed to read file ${files[index].name}:`,
            result.reason
          );
        }
      });

      return fileMessages;
    },

    getSystemPrompt(category: MessageCategory | null): string {
      const prompt = category
        ? CATEGORY_SYSTEM_PROMPTS[category]
        : DEFAULT_SYSTEM_PROMPT;
      console.log(`Using system prompt for category: ${category || "default"}`);
      return prompt;
    },

    async createCompletion() {
      const { client, config, abort } = Extension;

      console.log(`Starting completion (model: ${config.model})`);

      try {
        const messages = await this.prepareMessages();
        console.log(`Sending ${messages.length} messages`);

        const response = await client.chat.completions.create(
          {
            messages,
            model: config.model,
            temperature: config.temperature,
            max_completion_tokens: config.maxTokens,
            stream: true,
          },
          { signal: abort.signal }
        );

        console.log("Received streaming response");
        await this.handleStream(response);
      } catch (error) {
        console.error("Completion failed:", error);
        Extension.util.handleError(error);
      }
    },

    async handleStream(stream: OpenAIStream) {
      const { webview, history, abort } = Extension;
      let reply = "";

      postMessage(webview, "startAssistantMessage");

      try {
        for await (const chunk of stream) {
          if (abort.signal.aborted) {
            throw new Error("Request aborted");
          }

          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            reply += content;
            postMessage(webview, "appendChunk", content);
          }
        }

        // Only add to history if we got a complete response
        if (reply.trim()) {
          history.push({
            id: Date.now().toString(),
            role: "assistant",
            content: reply,
          });
        }

        postMessage(webview, "endAssistantMessage");
      } catch (error) {
        postMessage(webview, "endAssistantMessage");
        if (!abort.signal.aborted) {
          Extension.util.handleError(error);
        }
      }
    },
  },

  util: {
    getFileName(path: string): string {
      return path.split(/[\\/]/).pop() || "";
    },

    handleError(err: unknown) {
      const { webview } = Extension;

      let message = "An unknown error occurred";
      let code = "";

      if (typeof err === "string") {
        message = err;
      } else if (err instanceof Error) {
        message = err.message;
        code = "code" in err ? String(err.code) : "";
      } else if (err && typeof err === "object" && "message" in err) {
        message = String(err.message);
        code = "code" in err ? String(err.code) : "";
      }

      console.error("Extension error:", { message, code, err });
      postMessage(webview, "apiError", { message, code });
    },

    validateConfiguration(config: Configuration): string[] {
      const errors: string[] = [];

      if (!config.baseUrl || config.baseUrl.trim() === "") {
        errors.push("Base URL is required");
      }

      if (!config.model || config.model.trim() === "") {
        errors.push("Model is required");
      }

      return errors;
    },
  },

  async loadConfigs(): Promise<void> {
    try {
      const configs = (await this.context.globalState.get("aiChatConfigs")) as
        | Configuration[]
        | undefined;

      if (!Array.isArray(configs) || configs.length === 0) {
        return;
      }

      this.configs = configs;
      const activeConfig = configs.find((config) => config.active);

      if (!activeConfig) {
        throw new Error("No active config");
      }

      this.config = activeConfig;
      this.updateClient(this.config);
    } catch (error) {
      console.error("Failed to load configuration:", error);
      this.configs = [];
      this.config = { ...DEFAULT_CONFIG };
    }
  },

  async saveConfigs(configs: Configuration[]): Promise<void> {
    try {
      // Validate all configurations
      for (const config of configs) {
        const validationErrors = this.util.validateConfiguration(config);
        if (validationErrors.length > 0) {
          throw new Error(
            `Invalid configuration "${config.name}": ${validationErrors.join(
              ", "
            )}`
          );
        }
      }

      // Ensure only one config is marked as active
      const activeConfigs = configs.filter((config) => config.active);
      if (activeConfigs.length !== 1) {
        throw new Error("Exactly one configuration must be marked as active");
      }

      await this.context.globalState.update("aiChatConfigs", configs);
      this.configs = configs;

      // Update current active config
      const activeConfig = configs.find((config) => config.active)!;
      this.config = { ...DEFAULT_CONFIG, ...activeConfig };
      this.updateClient(this.config);

      console.log("Configurations saved successfully");
    } catch (error) {
      console.error("Failed to save configurations:", error);
      throw error;
    }
  },

  sendConfigurations(): void {
    const { webview, configs } = this;
    postMessage(webview, "getConfigs", configs);
  },

  updateClient(config: Configuration): void {
    this.client = new OpenAI({
      apiKey: config.apiKey || "no-key",
      baseURL: config.baseUrl,
    });
  },
};

export function activate(context: vscode.ExtensionContext) {
  Extension.init(context);
}
