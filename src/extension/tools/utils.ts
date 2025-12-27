import * as path from "path";
import * as vscode from "vscode";

export function resolveWorkspacePath(inputPath: string): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) throw new Error("No workspace folder open");
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.join(workspaceRoot, inputPath);
}
