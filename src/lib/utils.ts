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
  const selections = editor.selections
    .filter(
      (selection) =>
        !selection.isEmpty &&
        (selection.start.line !== selection.end.line ||
          selection.end.character - selection.start.character > 0)
    )
    .map((selection) => ({
      start: selection.start.line,
      end: selection.end.line,
    }));

  return selections.length > 0 ? selections : undefined;
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

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

export function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return IMAGE_EXTENSIONS.includes(ext);
}

export function getImageMimeType(filename: string): string {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf(".") + 1);
  if (ext === "jpg") return "jpeg";
  return ext;
}

export function isPdfFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}
