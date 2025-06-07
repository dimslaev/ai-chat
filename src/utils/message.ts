import { Webview } from "vscode";
import {
  vscodeApi,
  PostMessageType,
  PostMessagePayloadMap,
  Message,
  OpenAIMessage,
} from "../types";

export function postMessage<T extends PostMessageType>(
  target: vscodeApi | Webview,
  type: T,
  payload?: PostMessagePayloadMap[T]
) {
  target.postMessage({ type, payload });
}

export function toOpenAIMessage(message: Message): OpenAIMessage {
  const clone: Partial<Message> = { ...message };
  delete clone.id;
  return clone as OpenAIMessage;
}
