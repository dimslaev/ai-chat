import OpenAI from "openai";
import { Stream } from "openai/streaming";
import * as vscode from "vscode";
import { z } from "zod";
import { ConfigurationSchema } from "./schema";

/* VSCode */
export type vscodeApi = {
  postMessage(message: unknown): void;
};

/* Open AI */
export type OpenAIMessage = OpenAI.ChatCompletionMessageParam;
export type OpenAIStream = Stream<OpenAI.ChatCompletionChunk>;

/* Config */
export type Configuration = z.infer<typeof ConfigurationSchema>;

export type FileInfo = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
};

/* Messages */

export type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  hidden?: boolean;
  toolCallId?: string; // For tool role messages
  toolCalls?: Array<{ id: string; name: string; arguments: string }>; // For assistant messages with tool calls
};

export type AttachedFile = {
  name: string;
  fileUri: vscode.Uri;
  selections?: Array<{
    start: number;
    end: number;
  }>;
};

export type ApiError = {
  code?: string;
  message?: string;
} | null;

export type TokenUsageRaw = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

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
  | "stopStream"
  | "activeFileChanged"
  | "attachFile"
  | "removeAttachedFile"
  | "toggleSuggestedFile"
  | "focusInput"
  | "openConfigMenu"
  | "apiError"
  | "cleanup"
  | "saveConfigs"
  | "getConfigs"
  | "exportConfig"
  | "saveChat"
  | "setAgentMode"
  | "setInputValue"
  | "tokenUsage";

export type PostMessagePayloadMap = {
  getState: undefined;
  setState: {
    history: Message[];
    attachedFiles: AttachedFile[];
    suggestedFile: AttachedFile | null;
    inputValue?: string;
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
  exportConfig: Configuration;
  setAgentMode: boolean;
  setInputValue: string;
  tokenUsage: TokenUsage;
  toggleSuggestedFile: undefined;
  focusInput: undefined;
  openConfigMenu: undefined;
};

export type PostMessage = {
  [K in PostMessageType]: {
    type: K;
    payload: PostMessagePayloadMap[K];
  };
}[PostMessageType];
