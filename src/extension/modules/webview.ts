import * as vscode from "vscode";
import { Log } from "./log";
import { App } from "./app";
import { Chat } from "./chat-completion";
import { postMessage } from "../../utils/message";
import { Message, AttachedFile, PostMessage } from "../../types";

export namespace Webview {
  const log = Log.create({ service: "webview" });

  export function setup(webviewView: vscode.WebviewView) {
    log.info("setting up webview");

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [App.state().context.extensionUri],
    };

    webviewView.webview.html = getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(handleMessage);

    webviewView.onDidDispose(() => {
      log.info("webview disposed");
      App.abort();
    });
  }

  function getHtml(webview: vscode.Webview): string {
    const app = App.state();
    const webviewUri = vscode.Uri.joinPath(
      app.context.extensionUri,
      "out",
      "webview.js"
    );
    const scriptUri = webview.asWebviewUri(webviewUri);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AI Chat</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/atom-one-dark.min.css">
      </head>
      <body>
          <div id="root"></div>
          <script src="${scriptUri.toString()}"></script>
      </body>
      </html>
    `;
  }

  export function handleMessage(data: PostMessage) {
    switch (data.type) {
      case "getState":
        sendState();
        break;
      case "sendMessage":
        handleUserMessage(data.payload);
        break;
      case "stopStream":
        stopStream();
        break;
      case "attachFile":
        attachFile(data.payload);
        break;
      case "removeAttachedFile":
        removeFile(data.payload);
        break;
      case "cleanup":
        App.cleanup();
        break;
      case "toggleTools":
        App.setToolsEnabled(data.payload);
        break;
      default:
        log.warn("unknown message type", { type: data.type });
    }
  }

  export function sendState() {
    const app = App.state();
    const webview = App.webview();
    const { activeTextEditor } = vscode.window;

    log.info("sending state", {
      historyCount: app.history.length,
      filesCount: app.files.length,
    });

    postMessage(webview, "setState", {
      history: app.history,
      attachedFiles: app.files,
      suggestedFile: activeTextEditor
        ? {
            name: activeTextEditor.document.uri.path.split(/[\\/]/).pop() || "",
            fileUri: activeTextEditor.document.uri,
          }
        : null,
      toolsEnabled: app.config.USE_TOOLS,
    });
  }

  async function handleUserMessage(message: Message) {
    log.info("user message received", { length: message.content.length });

    App.addMessage(message);
    await Chat.createCompletion();
  }

  function stopStream() {
    const webview = App.webview();
    App.abort();
    postMessage(webview, "endAssistantMessage");
    log.info("stream stopped");
  }

  function attachFile(file: AttachedFile) {
    App.addFile(file);
  }

  function removeFile(file: AttachedFile) {
    App.removeFile(file);
  }

  export function onActiveFileChanged(): vscode.Disposable {
    return vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const webview = App.webview();
        postMessage(webview, "activeFileChanged", {
          name: editor.document.uri.path.split(/[\\/]/).pop() || "",
          fileUri: editor.document.uri,
        });
      }
    });
  }
}
