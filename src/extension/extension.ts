"use strict";

import * as vscode from "vscode";
import * as State from "@/extension/state";
import * as Webview from "@/extension/webview";
import * as Config from "@/extension/config";
import {
  getFileName,
  getEditorSelection,
  isImageFile,
  isPdfFile,
} from "@/lib/utils";

const WEBVIEW_FOCUS_DELAY_MS = 100;

async function init(ctx: vscode.ExtensionContext) {
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

function registerWebviewProvider(ctx: vscode.ExtensionContext) {
  const provider = { resolveWebviewView: Webview.setup };
  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("ai-chat-view", provider)
  );
}

function getActiveTabUri(): vscode.Uri | undefined {
  const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (!activeTab) return undefined;

  const input = activeTab.input;
  if (input instanceof vscode.TabInputText) {
    return input.uri;
  }
  if (input instanceof vscode.TabInputCustom) {
    return input.uri;
  }
  return undefined;
}

function registerFileChangeListener(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
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

  ctx.subscriptions.push(
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

  // Listen for tab changes to detect image and PDF files
  ctx.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs(() => {
      const uri = getActiveTabUri();
      if (uri && (isImageFile(uri.path) || isPdfFile(uri.path))) {
        const fileName = getFileName(uri.path);
        Webview.post("activeFileChanged", {
          name: fileName,
          fileUri: uri,
          selections: undefined,
        });
      }
    })
  );
}

function registerCommands(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("ai-chat.toggleSuggestedFile", () => {
      const editor = vscode.window.activeTextEditor;

      let file;
      if (editor) {
        const fileName = getFileName(editor.document.uri.path);
        const selections = getEditorSelection(editor);
        file = {
          name: fileName,
          fileUri: editor.document.uri,
          selections,
        };
      } else {
        // Check for non-text files (like images) via active tab
        const uri = getActiveTabUri();
        if (uri) {
          file = {
            name: getFileName(uri.path),
            fileUri: uri,
            selections: undefined,
          };
        }
      }

      if (file) {
        State.toggleFile(file);

        Webview.post("setState", {
          history: State.get.history,
          attachedFiles: State.get.files,
          suggestedFile: file,
          configs: State.get.configs,
          inputValue: State.get.inputValue,
        });
      }
    })
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand("ai-chat.focusInput", async () => {
      // Focus the AI Chat view (this will open it if closed)
      await vscode.commands.executeCommand("ai-chat-view.focus");
      await new Promise((resolve) =>
        setTimeout(resolve, WEBVIEW_FOCUS_DELAY_MS)
      );
      Webview.post("focusInput");
    })
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand("ai-chat.changeConfig", async () => {
      // Focus the AI Chat view (this will open it if closed)
      await vscode.commands.executeCommand("ai-chat-view.focus");
      await new Promise((resolve) =>
        setTimeout(resolve, WEBVIEW_FOCUS_DELAY_MS)
      );
      Webview.post("openConfigMenu");
    })
  );
}

export function activate(context: vscode.ExtensionContext) {
  init(context);
}
