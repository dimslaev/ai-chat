"use strict";

import * as vscode from "vscode";
import { State } from "./state";
import { Webview } from "./webview";
import { Config } from "./config";
import { getFileName } from "./utils";

export namespace Extension {
  export async function init(ctx: vscode.ExtensionContext) {
    State.setContext(ctx);
    State.resetAbort();

    try {
      await Config.initialize();
      registerWebviewProvider();
      registerFileChangeListener();
    } catch (error) {
      console.error("Failed to initialize extension:", error);
      vscode.window.showErrorMessage("AI Chat extension failed to initialize");
    }
  }

  function registerWebviewProvider() {
    const provider = { resolveWebviewView: Webview.setup };
    State.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider("ai-chat-view", provider)
    );
  }

  function registerFileChangeListener() {
    State.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          const fileName = getFileName(editor.document.uri.path);
          Webview.post("activeFileChanged", {
            name: fileName,
            fileUri: editor.document.uri,
          });
        }
      })
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  Extension.init(context);
}
