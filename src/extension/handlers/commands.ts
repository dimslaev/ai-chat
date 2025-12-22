import * as vscode from "vscode";

import * as State from "@/extension/core/state";
import { post } from "@/extension/handlers/messages";
import {
  getEditorSelection,
  getFileName,
  isImageFile,
  isPdfFile,
} from "@/lib/utils";

const WEBVIEW_FOCUS_DELAY_MS = 100;

export function getActiveTabUri(): vscode.Uri | undefined {
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

export function postActiveFileChanged(
  editor: vscode.TextEditor | undefined,
  uri?: vscode.Uri,
): void {
  if (editor) {
    const fileName = getFileName(editor.document.uri.path);
    const selections = getEditorSelection(editor);
    post("activeFileChanged", {
      name: fileName,
      fileUri: editor.document.uri,
      selections,
    });
  } else if (uri) {
    post("activeFileChanged", {
      name: getFileName(uri.path),
      fileUri: uri,
      selections: undefined,
    });
  }
}

export function registerCommands(ctx: vscode.ExtensionContext): void {
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

        post("setState", {
          history: State.get.history,
          attachedFiles: State.get.files,
          suggestedFile: file,
          configs: State.get.configs,
          inputValue: State.get.inputValue,
        });
      }
    }),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand("ai-chat.focusInput", async () => {
      await vscode.commands.executeCommand("ai-chat-view.focus");
      await new Promise((resolve) =>
        setTimeout(resolve, WEBVIEW_FOCUS_DELAY_MS),
      );
      post("focusInput");
    }),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand("ai-chat.changeConfig", async () => {
      await vscode.commands.executeCommand("ai-chat-view.focus");
      await new Promise((resolve) =>
        setTimeout(resolve, WEBVIEW_FOCUS_DELAY_MS),
      );
      post("openConfigMenu");
    }),
  );
}

export function registerFileChangeListener(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        postActiveFileChanged(editor);
      }
    }),
  );

  ctx.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      postActiveFileChanged(event.textEditor);
    }),
  );

  ctx.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs(() => {
      const uri = getActiveTabUri();
      if (uri && (isImageFile(uri.path) || isPdfFile(uri.path))) {
        postActiveFileChanged(undefined, uri);
      }
    }),
  );
}
