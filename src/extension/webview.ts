import * as vscode from "vscode";
import {
  PostMessage,
  AttachedFile,
  Message,
  PostMessageType,
  PostMessagePayloadMap,
} from "../types";
import { State } from "./state";
import { Chat } from "./chat";
import { Config } from "./config";
import { postMessage } from "../utils/message";
import { getFileName } from "./utils";

export namespace Webview {
  export function setup(webviewView: vscode.WebviewView) {
    State.setWebview(webviewView.webview);

    State.webview.options = {
      enableScripts: true,
      localResourceRoots: [State.context.extensionUri],
    };

    State.webview.html = getHtml();

    State.webview.onDidReceiveMessage((data: PostMessage) => {
      handleMessage(data);
    });

    webviewView.onDidDispose(
      () => {
        State.abort.abort();
      },
      null,
      State.context.subscriptions
    );
  }

  function getHtml(): string {
    const webviewUri = vscode.Uri.joinPath(
      State.context.extensionUri,
      "out",
      "webview.js"
    );
    const scriptUri = State.webview.asWebviewUri(webviewUri);

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

  function handleMessage(data: PostMessage) {
    try {
      switch (data.type) {
        case "getState":
          sendState();
          break;
        case "sendMessage":
          handleUserMessage(data.payload);
          break;
        case "editMessage":
          handleEditMessage(data.payload);
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
          cleanup();
          break;
        case "saveConfigs":
          Config.save(data.payload);
          break;
        case "getConfigs":
          post("getConfigs", State.configs);
          break;
        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      handleError(error);
    }
  }

  function sendState() {
    const { activeTextEditor } = vscode.window;
    postMessage(State.webview, "setState", {
      history: State.history,
      attachedFiles: State.files,
      suggestedFile: activeTextEditor
        ? {
            name: activeTextEditor.document.uri.path.split(/[\\/]/).pop() || "",
            fileUri: activeTextEditor.document.uri,
          }
        : null,
      configs: State.configs,
    });
  }

  async function handleUserMessage(payload: Message) {
    State.history = [...State.history, payload];
    State.resetAbort();

    await Chat.createCompletion({
      onStart: () => post("startAssistantMessage"),
      onChunk: (content: string) => post("appendChunk", content),
      onEnd: () => post("endAssistantMessage"),
      onError: (error: unknown) => handleError(error),
    });
  }

  async function handleEditMessage(payload: { id: string; content: string }) {
    const messageIndex = State.history.findIndex(
      (msg: Message) => msg.id === payload.id
    );

    if (messageIndex === -1) return;

    const updatedHistory = [...State.history];
    updatedHistory[messageIndex] = {
      ...updatedHistory[messageIndex],
      content: payload.content,
    };

    State.history = updatedHistory.slice(0, messageIndex + 1);
    State.resetAbort();

    await Chat.createCompletion({
      onStart: () => post("startAssistantMessage"),
      onChunk: (content: string) => post("appendChunk", content),
      onEnd: () => post("endAssistantMessage"),
      onError: (error: unknown) => handleError(error),
    });
  }

  function stopStream() {
    State.abort.abort();
    postMessage(State.webview, "endAssistantMessage");
  }

  function attachFile(payload: AttachedFile) {
    const { fileUri } = payload;
    const fileName = getFileName(fileUri.path);

    if (
      !State.files.some((f: AttachedFile) => f.fileUri.path === fileUri.path)
    ) {
      State.files.push({ name: fileName, fileUri });
    }
  }

  function removeFile(payload: AttachedFile) {
    const index = State.files.findIndex(
      (file: AttachedFile) => file.fileUri.path === payload.fileUri.path
    );
    if (index !== -1) {
      State.files.splice(index, 1);
    }
  }

  function cleanup() {
    State.history = [];
    State.files = [];
    State.category = null;
  }

  export function post<T extends PostMessageType>(
    type: T,
    payload?: PostMessagePayloadMap[T]
  ) {
    postMessage(State.webview, type, payload);
  }

  export async function handleError(err: unknown) {
    let message = "An unknown error occurred";
    let code = "";

    if (typeof err === "string") {
      message = err;
    } else if (err instanceof Error) {
      message = err.message;
      code = "code" in err ? String(err.code) : "";
    } else if (err && typeof err === "object" && "message" in err) {
      message = String(err.message);
      code = "code" in err ? String(err.code) : "";
    }

    console.error("Extension error:", { message, code, err });

    post("apiError", { message, code });
  }
}
