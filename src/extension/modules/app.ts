import * as vscode from "vscode";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { Log } from "./log";
import { Config } from "./config";
import { ToolExecutor } from "./tool-executor";
import { Message, AttachedFile, AIClient } from "../../types";

export namespace App {
  const log = Log.create({ service: "app" });

  export interface State {
    context: vscode.ExtensionContext;
    webview: vscode.Webview;
    client: AIClient;
    config: Config.AppConfig;
    history: Message[];
    files: AttachedFile[];
    abort: AbortController;
    executor: ToolExecutor;
    todos: TodoInfo[];
  }

  export interface TodoInfo {
    id: string;
    description: string;
    status: "pending" | "in_progress" | "completed";
    created: number;
    updated: number;
  }

  let appState: State | null = null;

  export function state(): State {
    if (!appState) {
      throw new Error("App not initialized");
    }
    return appState;
  }

  export function webview(): vscode.Webview {
    return state().webview;
  }

  export function addMessage(message: Message): void {
    const app = state();
    app.history = [...app.history, message];
    log.info("message added", {
      role: message.role,
      length: message.content.length,
    });
  }

  export function addFile(file: AttachedFile): void {
    const app = state();
    if (!app.files.find((f) => f.fileUri.path === file.fileUri.path)) {
      app.files = [...app.files, file];
      log.info("file attached", { name: file.name, path: file.fileUri.path });
    }
  }

  export function removeFile(file: AttachedFile): void {
    const app = state();
    app.files = app.files.filter((f) => f.fileUri.path !== file.fileUri.path);
    log.info("file removed", { name: file.name });
  }

  export function setToolsEnabled(enabled: boolean): void {
    const app = state();
    app.config.USE_TOOLS = enabled;
    Config.setToolsEnabled(app.context, enabled);
    log.info("tools enabled changed", { enabled });
  }

  export function abort(): void {
    const app = state();
    app.abort.abort();
    app.abort = new AbortController();
    log.info("operation aborted");
  }

  export function cleanup(): void {
    const app = state();
    app.files = [];
    app.history = [];
    app.todos = [];
    log.info("app cleaned up");
  }

  export function addTodo(description: string): string {
    const app = state();
    const id = Math.random().toString(36).substr(2, 9);
    const todo: TodoInfo = {
      id,
      description,
      status: "pending",
      created: Date.now(),
      updated: Date.now(),
    };
    app.todos = [...app.todos, todo];
    log.info("todo added", { id, description });
    return id;
  }

  export function updateTodoStatus(
    id: string,
    status: "pending" | "in_progress" | "completed"
  ): boolean {
    const app = state();
    const todoIndex = app.todos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return false;

    app.todos = app.todos.map((todo) =>
      todo.id === id ? { ...todo, status, updated: Date.now() } : todo
    );
    log.info("todo status updated", { id, status });
    return true;
  }

  export function getTodos(): TodoInfo[] {
    const app = state();
    return [...app.todos];
  }

  export function removeTodo(id: string): boolean {
    const app = state();
    const initialLength = app.todos.length;
    app.todos = app.todos.filter((t) => t.id !== id);
    const removed = app.todos.length < initialLength;
    if (removed) {
      log.info("todo removed", { id });
    }
    return removed;
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
    cb: (info: State) => Promise<T>
  ): Promise<T> {
    log.info("initializing app", { extensionPath: context.extensionPath });

    const config = Config.get();
    const client = createClient(config);

    // Set up tool executor with workspace root
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
    const executor = new ToolExecutor();
    executor.setWorkspaceRoot(workspaceRoot);

    const app: State = {
      context,
      webview,
      client,
      config,
      history: [],
      files: [],
      abort: new AbortController(),
      executor,
      todos: [],
    };

    log.info("app initialized", {
      provider: config.PROVIDER,
      model: config.MODEL,
      workspaceRoot,
    });

    appState = app;
    return cb(app);
  }

  export function onConfigurationChanged(): vscode.Disposable {
    return Config.onConfigurationChanged((newConfig) => {
      const app = state();
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
