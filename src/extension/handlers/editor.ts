import * as vscode from "vscode";

import { State } from "@/extension/core/state";
import { getFileName, isImageFile, isPdfFile, postMessage } from "@/lib/utils";

/**
 * Editor integration
 * file/selection change listeners and keyboard commands
 */

const WEBVIEW_FOCUS_DELAY_MS = 100;

class EditorHandler {
  // Listens for editor, selection, and tab changes to update webview
  registerFileChangeListener(ctx: vscode.ExtensionContext): void {
    ctx.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.#postActiveFileChanged(editor);
        }
      }),
    );

    ctx.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection((event) => {
        this.#postActiveFileChanged(event.textEditor);
      }),
    );

    ctx.subscriptions.push(
      vscode.window.tabGroups.onDidChangeTabs(() => {
        const uri = this.#getActiveTabUri();
        if (uri && (isImageFile(uri.path) || isPdfFile(uri.path))) {
          this.#postActiveFileChanged(undefined, uri);
        }
      }),
    );
  }

  // Extracts non-empty line ranges from editor selections
  getEditorSelection(editor: vscode.TextEditor) {
    const selections = editor.selections
      .filter(
        (selection) =>
          !selection.isEmpty && selection.start.line !== selection.end.line,
      )
      .map((selection) => ({
        start: selection.start.line,
        end: selection.end.line,
      }));

    return selections.length > 0 ? selections : undefined;
  }

  // Registers keyboard shortcut commands (toggle file, focus input, change config)
  registerEditor(ctx: vscode.ExtensionContext): void {
    ctx.subscriptions.push(
      vscode.commands.registerCommand("ai-chat.toggleSuggestedFile", () => {
        const editor = vscode.window.activeTextEditor;

        let file;
        if (editor) {
          const fileName = getFileName(editor.document.uri.path);
          const selections = this.getEditorSelection(editor);
          file = {
            name: fileName,
            filePath: editor.document.uri.fsPath,
            selections,
          };
        } else {
          const uri = this.#getActiveTabUri();
          if (uri) {
            file = {
              name: getFileName(uri.path),
              filePath: uri.fsPath,
              selections: undefined,
            };
          }
        }

        if (file) {
          State.toggleFile(file);

          postMessage(State.webview, "setState", {
            history: State.history,
            attachedFiles: State.files,
            suggestedFile: file,
            configs: State.configs,
            inputValue: State.inputValue,
            plan: State.plan,
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
        postMessage(State.webview, "focusInput");
      }),
    );

    ctx.subscriptions.push(
      vscode.commands.registerCommand("ai-chat.changeConfig", async () => {
        await vscode.commands.executeCommand("ai-chat-view.focus");
        await new Promise((resolve) =>
          setTimeout(resolve, WEBVIEW_FOCUS_DELAY_MS),
        );
        postMessage(State.webview, "openConfigMenu");
      }),
    );
  }

  // Gets URI from active tab (text or custom input like images/PDFs)
  #getActiveTabUri(): vscode.Uri | undefined {
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

  // Sends active file info (name, path, selections) to webview
  #postActiveFileChanged(
    editor: vscode.TextEditor | undefined,
    uri?: vscode.Uri,
  ): void {
    if (editor) {
      const fileName = getFileName(editor.document.uri.path);
      const selections = this.getEditorSelection(editor);
      postMessage(State.webview, "activeFileChanged", {
        name: fileName,
        filePath: editor.document.uri.fsPath,
        selections,
      });
    } else if (uri) {
      postMessage(State.webview, "activeFileChanged", {
        name: getFileName(uri.path),
        filePath: uri.fsPath,
        selections: undefined,
      });
    }
  }
}

export const Editor = new EditorHandler();
