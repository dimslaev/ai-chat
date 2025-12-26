import { tool } from "ai";
import * as path from "path";
import * as vscode from "vscode";
import { z } from "zod";

import { filterEntries, isIgnoredPath } from "./safety";

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
      "The directory path to list (relative to workspace root, e.g. 'src' or 'src/components')",
    ),
});

export const listDirectoryTool = tool({
  description:
    "Lists files and directories at the specified path. Automatically filters out node_modules, dist, .git, and other build directories.",
  inputSchema,
  execute: async ({ path: inputPath }) => {
    if (isIgnoredPath(inputPath)) {
      throw new Error(
        "Cannot list ignored directories (node_modules, dist, etc.)",
      );
    }

    const resolvedPath = resolveWorkspacePath(inputPath);
    const uri = vscode.Uri.file(resolvedPath);
    const entries = await vscode.workspace.fs.readDirectory(uri);

    const mapped = entries.map(([name, type]) => ({
      name,
      type: (type === vscode.FileType.Directory ? "directory" : "file") as
        | "file"
        | "directory",
    }));

    return {
      path: resolvedPath,
      entries: filterEntries(mapped),
    };
  },
});
