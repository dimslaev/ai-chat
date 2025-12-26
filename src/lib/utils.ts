import { Webview } from "vscode";

import { PostMessagePayloadMap, PostMessageType, vscodeApi } from "./types";

export function postMessage<T extends PostMessageType>(
  target: vscodeApi | Webview,
  type: T,
  payload?: PostMessagePayloadMap[T],
) {
  target.postMessage({ type, payload });
}

export function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || "";
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

export function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, "")
      .replace(/\s+/g, "_")
      .split("_")
      .slice(0, 5)
      .join("_") || "untitled"
  );
}
