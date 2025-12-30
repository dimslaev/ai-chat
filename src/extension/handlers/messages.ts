import * as vscode from "vscode";

import { Config } from "@/extension/core/config";
import { State } from "@/extension/core/state";
import { Editor } from "@/extension/handlers/editor";
import { Completion } from "@/extension/services/completion";
import { FileWriter } from "@/extension/services/file-writer";
import {
  AttachedFile,
  Message,
  PostMessage,
  PostMessagePayloadMap,
  PostMessageType,
} from "@/lib/types";
import { getFileName, postMessage } from "@/lib/utils";

/**
 * Webview message router
 * handles all postMessage commands from UI
 */

class MessageHandler {
  // Routes incoming webview messages to appropriate handlers
  handle(data: PostMessage): void {
    try {
      switch (data.type) {
        case "getState":
          this.#sendState();
          break;
        case "sendMessage":
          this.#handleUserMessage(data.payload);
          break;
        case "editMessage":
          this.#handleEditMessage(data.payload);
          break;
        case "stopStream":
          this.#stopStream();
          break;
        case "attachFile":
          this.#attachFile(data.payload);
          break;
        case "removeAttachedFile":
          this.#removeAttachedFile(data.payload);
          break;
        case "cleanup":
          this.#cleanup();
          break;
        case "saveConfigs":
          Config.save(data.payload);
          break;
        case "getConfigs":
          this.post("getConfigs", State.configs);
          break;
        case "saveChat":
          FileWriter.exportChat(data.payload, this.handleError.bind(this));
          break;
        case "exportConfig":
          FileWriter.exportConfig(data.payload, this.handleError.bind(this));
          break;
        case "setInputValue":
          State.setInputValue(data.payload);
          break;
        case "setAgentMode":
          State.setAgentMode(data.payload);
          break;
        case "approvePlan":
          State.resolvePlanApproval(true);
          break;
        case "rejectPlan":
          State.resolvePlanApproval(false);
          State.abort.abort();
          State.resetAbort();
          break;
        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // Sends typed message to webview
  post<T extends PostMessageType>(
    type: T,
    payload?: PostMessagePayloadMap[T],
  ): void {
    postMessage(State.webview, type, payload);
  }

  // Formats error and sends to webview
  handleError(err: unknown): void {
    // Ignore abort triggered by user
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }

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
    this.post("apiError", { message, code });
  }

  // Sends current state (history, files, configs) to webview
  #sendState(): void {
    const { activeTextEditor } = vscode.window;

    let suggestedFile = null;
    if (activeTextEditor) {
      const selections = Editor.getEditorSelection(activeTextEditor);
      suggestedFile = {
        name: getFileName(activeTextEditor.document.uri.path),
        fileUri: activeTextEditor.document.uri,
        selections,
      };
    }

    this.post("setState", {
      history: State.history,
      attachedFiles: State.files,
      suggestedFile,
      configs: State.configs,
      inputValue: State.inputValue,
    });
  }

  // Processes user message and triggers AI completion
  async #handleUserMessage(payload: Message): Promise<void> {
    State.clearPlan();

    const message: Message = {
      ...payload,
      files: State.files.length > 0 ? [...State.files] : undefined,
    };
    State.setHistory([...State.history, message]);
    State.setFiles([]);
    State.resetAbort();

    await Completion.create({
      onStart: () => this.post("startAssistantMessage"),
      onChunk: (content: string) => this.post("appendChunk", content),
      onEnd: () => this.post("endAssistantMessage"),
      onError: (error: unknown) => this.handleError(error),
      onToolMessage: (message: Message) => this.post("addToolMessage", message),
      onTokenUsage: (usage) => {
        State.updateTokenUsage(usage);
        this.post("tokenUsage", State.tokenUsage);
      },
      onSetPlan: (plan) => this.post("setPlan", plan),
    });
  }

  // Edits message, truncates history, and regenerates response
  async #handleEditMessage(payload: {
    id: string;
    content: string;
  }): Promise<void> {
    State.clearPlan();

    const messageIndex = State.history.findIndex(
      (msg: Message) => msg.id === payload.id,
    );

    if (messageIndex === -1) return;

    const updatedHistory = [...State.history];
    updatedHistory[messageIndex] = {
      ...updatedHistory[messageIndex],
      content: payload.content,
    };

    State.setHistory(updatedHistory.slice(0, messageIndex + 1));
    State.resetAbort();

    await Completion.create({
      onStart: () => this.post("startAssistantMessage"),
      onChunk: (content: string) => this.post("appendChunk", content),
      onEnd: () => this.post("endAssistantMessage"),
      onError: (error: unknown) => this.handleError(error),
      onToolMessage: (message: Message) => this.post("addToolMessage", message),
      onTokenUsage: (usage) => {
        State.updateTokenUsage(usage);
        this.post("tokenUsage", State.tokenUsage);
      },
      onSetPlan: (plan) => this.post("setPlan", plan),
    });
  }

  // Adds file to message context
  #attachFile(payload: AttachedFile): void {
    const { fileUri, selections } = payload;
    const fileName = getFileName(fileUri.path);
    State.addFile({ name: fileName, fileUri, selections });
  }

  // Removes file from message context
  #removeAttachedFile(payload: AttachedFile): void {
    State.removeFile(payload.fileUri.path);
  }

  // Aborts ongoing completion
  #stopStream(): void {
    State.abort.abort();
    State.clearPlan();
    this.post("endAssistantMessage");
  }

  // Resets conversation state (history, files, tokens, plan)
  #cleanup(): void {
    State.abort.abort();
    State.clearPlan();
    State.setHistory([]);
    State.setFiles([]);
    State.setInputValue("");
    State.resetTokenUsage();
  }
}

export const Messages = new MessageHandler();
