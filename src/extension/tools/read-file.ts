import { tool } from "ai";
import * as path from "path";
import * as vscode from "vscode";
import { z } from "zod";

import { isIgnoredPath, isSensitivePath } from "./safety";

function resolveWorkspacePath(inputPath: string): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) throw new Error("No workspace folder open");
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.join(workspaceRoot, inputPath);
}

const inputSchema = z.object({
  path: z
    .string()
    .describe(
      "The file path to read (relative to workspace root, e.g. 'src/index.ts')",
    ),
});

export const readFileTool = tool({
  description:
    "Reads the contents of a file. Relative paths are resolved from the workspace root. Cannot read sensitive files (.env, credentials, keys).",
  inputSchema,
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
