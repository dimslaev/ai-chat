import * as vscode from "vscode";
import OpenAI from "openai";
import {
  Message,
  AttachedFile,
  MessageCategory,
  Configuration,
} from "../lib/types";

export namespace State {
  export let context: vscode.ExtensionContext;
  export let webview: vscode.Webview;
  export let client = new OpenAI({
    apiKey: "no-key",
    baseURL: "",
  });
  export let abort = new AbortController();
  export let configs: Configuration[] = [];
  export let config: Configuration = {
    id: "",
    name: "",
    active: false,
    apiKey: "",
    baseUrl: "",
    model: "",
    maxTokens: 8000,
    temperature: 0.1,
    historyLimit: 10,
  };

  // Chat state
  export let history: Message[] = [];
  export let files: AttachedFile[] = [];
  export let category: MessageCategory = "general";

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
}
