import { ImagePart, TextPart } from "ai";
import * as vscode from "vscode";
import { z } from "zod";

import { ConfigurationSchema } from "./schema";

/* VSCode */
export type vscodeApi = {
  postMessage(message: unknown): void;
};

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
  files?: AttachedFile[];
  toolCallId?: string;
  toolName?: string;
  toolArgs?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
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
  | "addToolMessage"
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
  | "tokenUsage"
  | "setPlan"
  | "approvePlan"
  | "rejectPlan";

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
  addToolMessage: Message;
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
  setPlan: Plan | null;
  approvePlan: undefined;
  rejectPlan: undefined;
};

export type PostMessage = {
  [K in PostMessageType]: {
    type: K;
    payload: PostMessagePayloadMap[K];
  };
}[PostMessageType];

export type FileContentPart = TextPart | ImagePart;

/* Plan */

export type PlanTask = {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
};

export type Plan = {
  id: string;
  messageId?: string;
  tasks: PlanTask[];
  status:
    | "awaiting_approval"
    | "approved"
    | "rejected"
    | "in_progress"
    | "completed";
};
