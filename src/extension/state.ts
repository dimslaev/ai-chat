import * as vscode from "vscode";
import OpenAI from "openai";
import { DEFAULT_CONFIG } from "@/lib/config";
import { Message, AttachedFile, Configuration } from "@/lib/types";

export namespace State {
  export let context: vscode.ExtensionContext;
  export let webview: vscode.Webview;
  export let client = new OpenAI({
    apiKey: "no-key",
    baseURL: "",
  });
  export let abort = new AbortController();
  export let configs: Configuration[] = [];
  export let config: Configuration = { ...DEFAULT_CONFIG };

  // Chat state
  export let history: Message[] = [];
  export let files: AttachedFile[] = [];
  export let inputValue = "";
  export let tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  export function setContext(ctx: vscode.ExtensionContext) {
    context = ctx;
  }

  export function setWebview(wv: vscode.Webview) {
    webview = wv;
  }

  export function setClient(newClient: OpenAI) {
    client = newClient;
  }

  export function setConfig(newConfig: Configuration) {
    config = newConfig;
  }

  export function setConfigs(newConfigs: Configuration[]) {
    configs = newConfigs;
  }

  export function resetAbort() {
    abort = new AbortController();
  }

  export function updateTokenUsage(usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }) {
    tokenUsage.promptTokens += usage.prompt_tokens || 0;
    tokenUsage.completionTokens += usage.completion_tokens || 0;
    tokenUsage.totalTokens += usage.total_tokens || 0;
  }

  export function resetTokenUsage() {
    tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  export function addFile(file: AttachedFile) {
    if (!files.some((f) => f.fileUri.path === file.fileUri.path)) {
      files.push(file);
    }
  }

  export function removeFile(filePath: string) {
    const index = files.findIndex((f) => f.fileUri.path === filePath);
    if (index !== -1) {
      files.splice(index, 1);
    }
  }

  export function toggleFile(file: AttachedFile) {
    const existingIndex = files.findIndex(
      (f) => f.fileUri.path === file.fileUri.path
    );
    if (existingIndex !== -1) {
      files.splice(existingIndex, 1);
    } else {
      files.push(file);
    }
  }
}
