"use strict";

import * as vscode from "vscode";

import { Config } from "@/extension/core/config";
import { State } from "@/extension/core/state";
import { setup as setupWebview } from "@/extension/core/webview";
import { Editor } from "@/extension/handlers/editor";
import { mcpManager } from "@/extension/mcp/manager";

/**
 * Extension entry point
 * activation, init, and cleanup
 */

async function init(ctx: vscode.ExtensionContext): Promise<void> {
  State.setContext(ctx);
  State.resetAbort();

  try {
    await Config.init();

    if (State.config.mcpServers?.length) {
      await mcpManager.init(State.config.mcpServers);
    }

    registerWebviewProvider(ctx);
    Editor.registerFileChangeListener(ctx);
    Editor.registerEditor(ctx);
  } catch (error) {
    console.error("Failed to initialize extension:", error);
    vscode.window.showErrorMessage("AI Chat extension failed to initialize");
  }
}

function registerWebviewProvider(ctx: vscode.ExtensionContext): void {
  const provider = { resolveWebviewView: setupWebview };
  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("ai-chat-view", provider),
  );
}

export function activate(context: vscode.ExtensionContext): void {
  init(context);
}

export async function deactivate(): Promise<void> {
  await mcpManager.dispose();
}
