import * as vscode from "vscode";
import OpenAI from "openai";
import { DEFAULT_CONFIG } from "@/lib/config";
import { Message, AttachedFile, Configuration } from "@/lib/types";

let _context: vscode.ExtensionContext;
let _webview: vscode.Webview;
let _client = new OpenAI({
  apiKey: "no-key",
  baseURL: "",
});
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

// Getters
export const get = {
  get context() { return _context; },
  get webview() { return _webview; },
  get client() { return _client; },
  get abort() { return _abort; },
  get configs() { return _configs; },
  get config() { return _config; },
  get history() { return _history; },
  get files() { return _files; },
  get inputValue() { return _inputValue; },
  get tokenUsage() { return _tokenUsage; },
};

// Setters
export function setContext(ctx: vscode.ExtensionContext) {
  _context = ctx;
}

export function setWebview(wv: vscode.Webview) {
  _webview = wv;
}

export function setClient(newClient: OpenAI) {
  _client = newClient;
}

export function setConfig(newConfig: Configuration) {
  _config = newConfig;
}

export function setConfigs(newConfigs: Configuration[]) {
  _configs = newConfigs;
}

export function setHistory(newHistory: Message[]) {
  _history = newHistory;
}

export function setFiles(newFiles: AttachedFile[]) {
  _files = newFiles;
}

export function setInputValue(value: string) {
  _inputValue = value;
}

export function resetAbort() {
  _abort = new AbortController();
}

export function updateTokenUsage(usage: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}) {
  _tokenUsage.promptTokens += usage.prompt_tokens || 0;
  _tokenUsage.completionTokens += usage.completion_tokens || 0;
  _tokenUsage.totalTokens += usage.total_tokens || 0;
}

export function resetTokenUsage() {
  _tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

export function addFile(file: AttachedFile) {
  if (!_files.some((f) => f.fileUri.path === file.fileUri.path)) {
    _files.push(file);
  }
}

export function removeFile(filePath: string) {
  const index = _files.findIndex((f) => f.fileUri.path === filePath);
  if (index !== -1) {
    _files.splice(index, 1);
  }
}

export function toggleFile(file: AttachedFile) {
  const existingIndex = _files.findIndex(
    (f) => f.fileUri.path === file.fileUri.path
  );
  if (existingIndex !== -1) {
    _files.splice(existingIndex, 1);
  } else {
    _files.push(file);
  }
}
