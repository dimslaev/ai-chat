import OpenAI from "openai";
import Groq from "groq-sdk";
import { Stream } from "openai/streaming";
import * as vscode from "vscode";

/* VSCode */
export type vscodeApi = {
  postMessage(message: unknown): void;
};

/* AI Providers */
export type Provider = "openai" | "groq";

export type AIClient = OpenAI | Groq;

/* Open AI */
export type OpenAIMessage = OpenAI.ChatCompletionMessageParam;
export type OpenAIStream = Stream<OpenAI.ChatCompletionChunk>;

/* Groq */
export type GroqMessage = Groq.Chat.ChatCompletionMessageParam;
export type GroqStream = Stream<Groq.Chat.ChatCompletionChunk>;

/* Unified types - both providers use same API format */
export type AIMessage = OpenAIMessage | GroqMessage;
export type AIStream = any; // Both providers return compatible stream objects

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
