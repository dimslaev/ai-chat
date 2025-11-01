"use strict";

import * as vscode from "vscode";
import { State } from "./state";
import { Webview } from "./webview";
import { Config } from "./config";
import { getFileName } from "../lib/utils";

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
          const selection = getEditorSelection(editor);
          Webview.post("activeFileChanged", {
            name: fileName,
            fileUri: editor.document.uri,
            selection,
          });
        }
      })
    );

    State.context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection((event) => {
        const editor = event.textEditor;
        const fileName = getFileName(editor.document.uri.path);
        const selection = getEditorSelection(editor);
        Webview.post("activeFileChanged", {
          name: fileName,
          fileUri: editor.document.uri,
          selection,
        });
      })
    );
  }

  function getEditorSelection(editor: vscode.TextEditor) {
    const selection = editor.selection;
    if (
      !selection.isEmpty &&
      (selection.start.line !== selection.end.line ||
        selection.end.character - selection.start.character > 0)
    ) {
      return {
        start: selection.start.line,
        end: selection.end.line,
      };
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  Extension.init(context);
}
