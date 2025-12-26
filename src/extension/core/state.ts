import * as vscode from "vscode";

import { DEFAULT_CONFIG } from "@/lib/config";
import {
  AttachedFile,
  Configuration,
  Message,
  TokenUsageRaw,
} from "@/lib/types";

let _context: vscode.ExtensionContext;
let _webview: vscode.Webview;
let _agentMode = false;
let _abort = new AbortController();
let _configs: Configuration[] = [];
let _config: Configuration = { ...DEFAULT_CONFIG };
let _history: Message[] = [];
let _files: AttachedFile[] = [];
let _inputValue = "";
let _tokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

export const get = {
  get context() {
    return _context;
  },
  get webview() {
    return _webview;
  },
  get agentMode() {
    return _agentMode;
  },
  get abort() {
    return _abort;
  },
  get configs() {
    return _configs;
  },
  get config() {
    return _config;
  },
  get history() {
    return _history;
  },
  get files() {
    return _files;
  },
  get inputValue() {
    return _inputValue;
  },
  get tokenUsage() {
    return _tokenUsage;
  },
};

export function setContext(ctx: vscode.ExtensionContext): void {
  _context = ctx;
}

export function setWebview(wv: vscode.Webview): void {
  _webview = wv;
}

export function setAgentMode(enabled: boolean): void {
  _agentMode = enabled;
}

export function setConfig(newConfig: Configuration): void {
  _config = newConfig;
}

export function setConfigs(newConfigs: Configuration[]): void {
  _configs = newConfigs;
}

export function setHistory(newHistory: Message[]): void {
  _history = newHistory;
}

export function setFiles(newFiles: AttachedFile[]): void {
  _files = newFiles;
}

export function setInputValue(value: string): void {
  _inputValue = value;
}

export function resetAbort(): void {
  _abort = new AbortController();
}

export function updateTokenUsage(usage: TokenUsageRaw): void {
  _tokenUsage.promptTokens += usage.prompt_tokens || 0;
  _tokenUsage.completionTokens += usage.completion_tokens || 0;
  _tokenUsage.totalTokens += usage.total_tokens || 0;
}

export function resetTokenUsage(): void {
  _tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

export function addFile(file: AttachedFile): void {
  if (!_files.some((f) => f.fileUri.path === file.fileUri.path)) {
    _files.push(file);
  }
}

export function removeFile(filePath: string): void {
  const index = _files.findIndex((f) => f.fileUri.path === filePath);
  if (index !== -1) {
    _files.splice(index, 1);
  }
}

export function toggleFile(file: AttachedFile): void {
  const existingIndex = _files.findIndex(
    (f) => f.fileUri.path === file.fileUri.path,
  );
  if (existingIndex !== -1) {
    _files.splice(existingIndex, 1);
  } else {
    _files.push(file);
  }
}
