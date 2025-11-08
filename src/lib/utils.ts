import { Webview, TextEditor } from "vscode";
import {
  vscodeApi,
  PostMessageType,
  PostMessagePayloadMap,
  Message,
  OpenAIMessage,
} from "./types";

export function postMessage<T extends PostMessageType>(
  target: vscodeApi | Webview,
  type: T,
  payload?: PostMessagePayloadMap[T]
) {
  target.postMessage({ type, payload });
}

export function toOpenAIMessage(message: Message): OpenAIMessage {
  const { id, ...rest } = message;
  return rest;
}

export function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || "";
}

export function getEditorSelection(editor: TextEditor) {
  const selection = editor.selection;
  if (
    !selection.isEmpty &&
    (selection.start.line !== selection.end.line ||
      selection.end.character - selection.start.character > 0)
  ) {
    return {
      start: selection.start.line,
      end: selection.end.line,
    };
  }
}

export function waitFrames(cb: () => void, n: number): void {
  if (n <= 0) {
    cb();
    return;
  }
  requestAnimationFrame(() => {
    waitFrames(cb, n - 1);
  });
}
