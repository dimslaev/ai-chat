"use strict";

import * as vscode from "vscode";
import { State } from "@/extension/state";
import { Webview } from "@/extension/webview";
import { Config } from "@/extension/config";
import { getFileName, getEditorSelection } from "@/lib/utils";

export namespace Extension {
  export async function init(ctx: vscode.ExtensionContext) {
    State.setContext(ctx);
    State.resetAbort();

    try {
      await Config.initialize();
      registerWebviewProvider();
      registerFileChangeListener();
      registerCommands();
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
          const selections = getEditorSelection(editor);
          Webview.post("activeFileChanged", {
            name: fileName,
            fileUri: editor.document.uri,
            selections,
          });
        }
      })
    );

    State.context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection((event) => {
        const editor = event.textEditor;
        const fileName = getFileName(editor.document.uri.path);
        const selections = getEditorSelection(editor);
        Webview.post("activeFileChanged", {
          name: fileName,
          fileUri: editor.document.uri,
          selections,
        });
      })
    );
  }

  function registerCommands() {
    State.context.subscriptions.push(
      vscode.commands.registerCommand("ai-chat.toggleSuggestedFile", () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const fileName = getFileName(editor.document.uri.path);
          const selections = getEditorSelection(editor);
          const file = {
            name: fileName,
            fileUri: editor.document.uri,
            selections,
          };

          State.toggleFile(file);

          Webview.post("setState", {
            history: State.history,
            attachedFiles: State.files,
            suggestedFile: file,
            configs: State.configs,
            inputValue: State.inputValue,
          });
        }
      })
    );

    State.context.subscriptions.push(
      vscode.commands.registerCommand("ai-chat.focusInput", async () => {
        // Focus the AI Chat view (this will open it if closed)
        await vscode.commands.executeCommand("ai-chat-view.focus");
        await new Promise((resolve) => setTimeout(resolve, 100));
        Webview.post("focusInput");
      })
    );

    State.context.subscriptions.push(
      vscode.commands.registerCommand("ai-chat.changeConfig", async () => {
        // Focus the AI Chat view (this will open it if closed)
        await vscode.commands.executeCommand("ai-chat-view.focus");
        await new Promise((resolve) => setTimeout(resolve, 100));
        Webview.post("openConfigMenu");
      })
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  Extension.init(context);
}
