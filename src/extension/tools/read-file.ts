import * as path from "path";
import * as vscode from "vscode";

import { isIgnoredPath, isSensitivePath } from "./safety";
import { defineTool } from "./tool";

type Args = { path: string };

function resolveWorkspacePath(inputPath: string): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) throw new Error("No workspace folder open");
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.join(workspaceRoot, inputPath);
}

export const readFileTool = defineTool<Args>({
  name: "read_file",
  description:
    "Reads the contents of a file. Relative paths are resolved from the workspace root. Cannot read sensitive files (.env, credentials, keys).",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "The file path to read (relative to workspace root, e.g. 'src/index.ts')",
      },
    },
    required: ["path"],
  },
  execute: async ({ path: inputPath }) => {
    if (isSensitivePath(inputPath)) {
      throw new Error("Cannot read sensitive files (env, credentials, keys)");
    }
    if (isIgnoredPath(inputPath)) {
      throw new Error(
        "Cannot read files in ignored directories (node_modules, dist, etc.)",
      );
    }

    const resolvedPath = resolveWorkspacePath(inputPath);
    const uri = vscode.Uri.file(resolvedPath);
    const data = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(data).toString("utf8");
    const lines = content.split("\n").length;

    const MAX_CHARS = 50000;
    const truncated =
      content.length > MAX_CHARS
        ? content.slice(0, MAX_CHARS) + "\n...[truncated]"
        : content;

    return { path: resolvedPath, content: truncated, lines };
  },
});
