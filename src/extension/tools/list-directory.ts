import * as vscode from "vscode";
import * as path from "path";
import { defineTool } from "./tool";
import { isIgnoredPath, filterEntries } from "./safety";

type Args = { path: string };

function resolveWorkspacePath(inputPath: string): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) throw new Error("No workspace folder open");
  return path.isAbsolute(inputPath) ? inputPath : path.join(workspaceRoot, inputPath);
}

export const listDirectoryTool = defineTool<Args>({
  name: "list_directory",
  description:
    "Lists files and directories at the specified path. Automatically filters out node_modules, dist, .git, and other build directories.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "The directory path to list (relative to workspace root, e.g. 'src' or 'src/components')",
      },
    },
    required: ["path"],
  },
  execute: async ({ path: inputPath }) => {
    if (isIgnoredPath(inputPath)) {
      throw new Error("Cannot list ignored directories (node_modules, dist, etc.)");
    }

    const resolvedPath = resolveWorkspacePath(inputPath);
    const uri = vscode.Uri.file(resolvedPath);
    const entries = await vscode.workspace.fs.readDirectory(uri);

    const mapped = entries.map(([name, type]) => ({
      name,
      type: (type === vscode.FileType.Directory ? "directory" : "file") as "file" | "directory",
    }));

    return {
      path: resolvedPath,
      entries: filterEntries(mapped),
    };
  },
});
