import OpenAI from "openai";
import { Stream } from "openai/streaming";
import * as vscode from "vscode";

/* VSCode */
export type vscodeApi = {
  postMessage(message: unknown): void;
};

/* Open AI */
export type OpenAIMessage = OpenAI.ChatCompletionMessageParam;
export type OpenAIStream = Stream<OpenAI.ChatCompletionChunk>;

/* Tool Calling */
export type FunctionCall = {
  name: string;
  arguments: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: FunctionCall;
};

/* Messages */
export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export type AttachedFile = {
  name: string;
  fileUri: vscode.Uri;
};

export type ApiError = {
  code?: string;
  message?: string;
} | null;

export type PostMessageType =
  | "getState"
  | "setState"
  | "sendMessage"
  | "startAssistantMessage"
  | "appendChunk"
  | "endAssistantMessage"
  | "activeFileChanged"
  | "stopStream"
  | "attachFile"
  | "removeAttachedFile"
  | "toggleTools"
  | "apiError"
  | "cleanup";

export type PostMessagePayloadMap = {
  getState: undefined;
  setState: {
    history: Message[];
    attachedFiles: AttachedFile[];
    suggestedFile: AttachedFile | null;
    toolsEnabled: boolean;
  };
  sendMessage: Message;
  startAssistantMessage: undefined;
  appendChunk: string;
  endAssistantMessage: undefined;
  activeFileChanged: AttachedFile;
  stopStream: undefined;
  attachFile: AttachedFile;
  removeAttachedFile: AttachedFile;
  toggleTools: boolean;
  apiError: ApiError;
  cleanup: undefined;
};

export type PostMessage = {
  [K in PostMessageType]: {
    type: K;
    payload: PostMessagePayloadMap[K];
  };
}[PostMessageType];
