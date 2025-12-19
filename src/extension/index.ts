"use strict";

import * as vscode from "vscode";
import * as State from "@/extension/core/state";
import * as Config from "@/extension/core/config";
import { setup as setupWebview } from "@/extension/webview/provider";
import {
  registerCommands,
  registerFileChangeListener,
} from "@/extension/handlers/commands";

async function init(ctx: vscode.ExtensionContext): Promise<void> {
  State.setContext(ctx);
  State.resetAbort();

  try {
    await Config.initialize();
    registerWebviewProvider(ctx);
    registerFileChangeListener(ctx);
    registerCommands(ctx);
  } catch (error) {
    console.error("Failed to initialize extension:", error);
    vscode.window.showErrorMessage("AI Chat extension failed to initialize");
  }
}

function registerWebviewProvider(ctx: vscode.ExtensionContext): void {
  const provider = { resolveWebviewView: setupWebview };
  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("ai-chat-view", provider)
  );
}

export function activate(context: vscode.ExtensionContext): void {
  init(context);
}
