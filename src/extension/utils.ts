export function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || "";
}
