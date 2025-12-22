import * as vscode from "vscode";

import * as Config from "@/extension/core/config";
import * as State from "@/extension/core/state";
import { createCompletion } from "@/extension/services/completion";
import {
  exportConfigToFile,
  saveChatToFile,
} from "@/extension/services/file-writer";
import {
  AttachedFile,
  Message,
  PostMessage,
  PostMessagePayloadMap,
  PostMessageType,
  TokenUsageRaw,
} from "@/lib/types";
import { getEditorSelection, getFileName, postMessage } from "@/lib/utils";

export function handleMessage(data: PostMessage): void {
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
        removeAttachedFile(data.payload);
        break;
      case "cleanup":
        cleanup();
        break;
      case "saveConfigs":
        Config.save(data.payload);
        break;
      case "getConfigs":
        post("getConfigs", State.get.configs);
        break;
      case "saveChat":
        saveChatToFile(data.payload, handleError);
        break;
      case "exportConfig":
        exportConfigToFile(data.payload, handleError);
        break;
      case "setInputValue":
        State.setInputValue(data.payload);
        break;
      case "setAgentMode":
        State.setAgentMode(data.payload);
        break;
      default:
        console.warn(`Unknown message type: ${data.type}`);
    }
  } catch (error) {
    handleError(error);
  }
}

function sendState(): void {
  const { activeTextEditor } = vscode.window;

  let suggestedFile = null;
  if (activeTextEditor) {
    const selections = getEditorSelection(activeTextEditor);
    suggestedFile = {
      name: getFileName(activeTextEditor.document.uri.path),
      fileUri: activeTextEditor.document.uri,
      selections,
    };
  }

  postMessage(State.get.webview, "setState", {
    history: State.get.history,
    attachedFiles: State.get.files,
    suggestedFile,
    configs: State.get.configs,
    inputValue: State.get.inputValue,
  });
}

async function handleUserMessage(payload: Message): Promise<void> {
  State.setHistory([...State.get.history, payload]);
  State.resetAbort();

  await createCompletion({
    onStart: () => post("startAssistantMessage"),
    onChunk: (content: string) => post("appendChunk", content),
    onEnd: () => post("endAssistantMessage"),
    onError: (error: unknown) => handleError(error),
    onTokenUsage: (usage) => {
      State.updateTokenUsage(usage);
      post("tokenUsage", State.get.tokenUsage);
    },
  });
}

async function handleEditMessage(payload: {
  id: string;
  content: string;
}): Promise<void> {
  const messageIndex = State.get.history.findIndex(
    (msg: Message) => msg.id === payload.id,
  );

  if (messageIndex === -1) return;

  const updatedHistory = [...State.get.history];
  updatedHistory[messageIndex] = {
    ...updatedHistory[messageIndex],
    content: payload.content,
  };

  State.setHistory(updatedHistory.slice(0, messageIndex + 1));
  State.resetAbort();

  await createCompletion({
    onStart: () => post("startAssistantMessage"),
    onChunk: (content: string) => post("appendChunk", content),
    onEnd: () => post("endAssistantMessage"),
    onError: (error: unknown) => handleError(error),
    onTokenUsage: (usage: TokenUsageRaw) => {
      State.updateTokenUsage(usage);
      post("tokenUsage", State.get.tokenUsage);
    },
  });
}

function stopStream(): void {
  State.get.abort.abort();
  postMessage(State.get.webview, "endAssistantMessage");
}

function attachFile(payload: AttachedFile): void {
  const { fileUri, selections } = payload;
  const fileName = getFileName(fileUri.path);
  State.addFile({ name: fileName, fileUri, selections });
}

function removeAttachedFile(payload: AttachedFile): void {
  State.removeFile(payload.fileUri.path);
}

function cleanup(): void {
  State.setHistory([]);
  State.setFiles([]);
  State.setInputValue("");
  State.resetTokenUsage();
}

export function post<T extends PostMessageType>(
  type: T,
  payload?: PostMessagePayloadMap[T],
): void {
  postMessage(State.get.webview, type, payload);
}

export function handleError(err: unknown): void {
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
