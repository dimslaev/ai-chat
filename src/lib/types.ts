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

export type Configuration = {
  id: string;
  name: string;
  active: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  historyLimit: number;
  systemPrompt: string;
};

export type FileInfo = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
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
  selection?: {
    start: number;
    end: number;
  };
};

export type ApiError = {
  code?: string;
  message?: string;
} | null;

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type PostMessageType =
  | "getState"
  | "setState"
  | "sendMessage"
  | "editMessage"
  | "startAssistantMessage"
  | "appendChunk"
  | "endAssistantMessage"
  | "activeFileChanged"
  | "stopStream"
  | "attachFile"
  | "removeAttachedFile"
  | "apiError"
  | "cleanup"
  | "saveConfigs"
  | "getConfigs"
  | "saveChat"
  | "tokenUsage";

export type PostMessagePayloadMap = {
  getState: undefined;
  setState: {
    history: Message[];
    attachedFiles: AttachedFile[];
    suggestedFile: AttachedFile | null;
    configs: Configuration[];
  };
  sendMessage: Message;
  editMessage: { id: string; content: string };
  startAssistantMessage: undefined;
  appendChunk: string;
  endAssistantMessage: undefined;
  activeFileChanged: AttachedFile;
  stopStream: undefined;
  attachFile: AttachedFile;
  removeAttachedFile: AttachedFile;
  apiError: ApiError;
  cleanup: undefined;
  saveConfigs: Configuration[];
  getConfigs: Configuration[];
  saveChat: string;
  tokenUsage: TokenUsage;
};

export type PostMessage = {
  [K in PostMessageType]: {
    type: K;
    payload: PostMessagePayloadMap[K];
  };
}[PostMessageType];
