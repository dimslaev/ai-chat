import * as vscode from "vscode";

import { DEFAULT_CONFIG } from "@/lib/config";
import {
  AttachedFile,
  Configuration,
  Message,
  TokenUsageRaw,
} from "@/lib/types";

/**
 * Global state management
 * config, history, files, tokens, abort controller
 */

class StateManager {
  #context!: vscode.ExtensionContext;
  #webview!: vscode.Webview;
  #agentMode = false;
  #abort = new AbortController();
  #configs: Configuration[] = [];
  #config: Configuration = { ...DEFAULT_CONFIG };
  #history: Message[] = [];
  #files: AttachedFile[] = [];
  #inputValue = "";
  #tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  get context(): vscode.ExtensionContext {
    return this.#context;
  }

  get webview(): vscode.Webview {
    return this.#webview;
  }

  get agentMode(): boolean {
    return this.#agentMode;
  }

  get abort(): AbortController {
    return this.#abort;
  }

  get configs(): Configuration[] {
    return this.#configs;
  }

  get config(): Configuration {
    return this.#config;
  }

  get history(): Message[] {
    return this.#history;
  }

  get files(): AttachedFile[] {
    return this.#files;
  }

  get inputValue(): string {
    return this.#inputValue;
  }

  get tokenUsage() {
    return this.#tokenUsage;
  }

  setContext(ctx: vscode.ExtensionContext): void {
    this.#context = ctx;
  }

  setWebview(wv: vscode.Webview): void {
    this.#webview = wv;
  }

  setAgentMode(enabled: boolean): void {
    this.#agentMode = enabled;
  }

  setConfig(newConfig: Configuration): void {
    this.#config = newConfig;
  }

  setConfigs(newConfigs: Configuration[]): void {
    this.#configs = newConfigs;
  }

  setHistory(newHistory: Message[]): void {
    this.#history = newHistory;
  }

  setFiles(newFiles: AttachedFile[]): void {
    this.#files = newFiles;
  }

  setInputValue(value: string): void {
    this.#inputValue = value;
  }

  resetAbort(): void {
    this.#abort = new AbortController();
  }

  updateTokenUsage(usage: TokenUsageRaw): void {
    this.#tokenUsage.promptTokens += usage.prompt_tokens || 0;
    this.#tokenUsage.completionTokens += usage.completion_tokens || 0;
    this.#tokenUsage.totalTokens += usage.total_tokens || 0;
  }

  resetTokenUsage(): void {
    this.#tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  addFile(file: AttachedFile): void {
    if (!this.#files.some((f) => f.fileUri.path === file.fileUri.path)) {
      this.#files.push(file);
    }
  }

  removeFile(filePath: string): void {
    const index = this.#files.findIndex((f) => f.fileUri.path === filePath);
    if (index !== -1) {
      this.#files.splice(index, 1);
    }
  }

  toggleFile(file: AttachedFile): void {
    const existingIndex = this.#files.findIndex(
      (f) => f.fileUri.path === file.fileUri.path,
    );
    if (existingIndex !== -1) {
      this.#files.splice(existingIndex, 1);
    } else {
      this.#files.push(file);
    }
  }
}

export const State = new StateManager();
