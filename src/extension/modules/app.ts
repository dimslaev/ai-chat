import * as vscode from "vscode";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { Context } from "./context";
import { Log } from "./log";
import { Config } from "./config";
import { ToolExecutor } from "./tool-executor";
import { Message, AttachedFile, AIClient } from "../../types";

export namespace App {
  const log = Log.create({ service: "app" });

  export interface Info {
    context: vscode.ExtensionContext;
    webview: vscode.Webview;
    client: AIClient;
    config: Config.AppConfig;
    history: Message[];
    files: AttachedFile[];
    abort: AbortController;
    executor: ToolExecutor;
  }

  const ctx = Context.create<Info>("app");

  export function info(): Info {
    return ctx.use();
  }

  export function webview(): vscode.Webview {
    return ctx.use().webview;
  }

  export function addMessage(message: Message): void {
    const app = ctx.use();
    app.history = [...app.history, message];
    log.info("message added", {
      role: message.role,
      length: message.content.length,
    });
  }

  export function addFile(file: AttachedFile): void {
    const app = ctx.use();
    if (!app.files.find((f) => f.fileUri.path === file.fileUri.path)) {
      app.files = [...app.files, file];
      log.info("file attached", { name: file.name, path: file.fileUri.path });
    }
  }

  export function removeFile(file: AttachedFile): void {
    const app = ctx.use();
    app.files = app.files.filter((f) => f.fileUri.path !== file.fileUri.path);
    log.info("file removed", { name: file.name });
  }

  export function setToolsEnabled(enabled: boolean): void {
    const app = ctx.use();
    app.config.USE_TOOLS = enabled;
    Config.setToolsEnabled(app.context, enabled);
    log.info("tools enabled changed", { enabled });
  }

  export function abort(): void {
    const app = ctx.use();
    app.abort.abort();
    app.abort = new AbortController();
    log.info("operation aborted");
  }

  export function cleanup(): void {
    const app = ctx.use();
    app.files = [];
    app.history = [];
    log.info("app cleaned up");
  }

  function createClient(config: Config.AppConfig): AIClient {
    const apiKey = Config.getApiKey();
    const baseURL = Config.getBaseURL();

    if (config.PROVIDER === "groq") {
      return new Groq({
        apiKey,
        ...(baseURL && { baseURL }),
      });
    } else {
      return new OpenAI({
        apiKey,
        baseURL: baseURL || "https://api.openai.com/v1",
      });
    }
  }

  export async function provide<T>(
    context: vscode.ExtensionContext,
    webview: vscode.Webview,
    cb: (info: Info) => Promise<T>
  ): Promise<T> {
    log.info("initializing app", { extensionPath: context.extensionPath });

    const config = Config.get();
    const client = createClient(config);

    // Set up tool executor with workspace root
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
    const executor = new ToolExecutor();
    executor.setWorkspaceRoot(workspaceRoot);

    const app: Info = {
      context,
      webview,
      client,
      config,
      history: [],
      files: [],
      abort: new AbortController(),
      executor,
    };

    log.info("app initialized", {
      provider: config.PROVIDER,
      model: config.MODEL,
      workspaceRoot,
    });

    return ctx.provideAsync(app, () => cb(app));
  }

  export function onConfigurationChanged(): vscode.Disposable {
    return Config.onConfigurationChanged((newConfig) => {
      const app = ctx.use();
      const oldProvider = app.config.PROVIDER;

      app.config = newConfig;

      // Reinitialize client if provider changed
      if (newConfig.PROVIDER !== oldProvider) {
        app.client = createClient(newConfig);
        log.info("client reinitialized", {
          oldProvider,
          newProvider: newConfig.PROVIDER,
        });
      }
    });
  }
}
