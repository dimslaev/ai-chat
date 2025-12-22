import * as vscode from "vscode";
import { defineTool } from "./tool";
import { EXCLUDE_PATTERN, isSensitivePath } from "./safety";

type Args = { query: string; file_pattern?: string };

export const searchFilesTool = defineTool<Args>({
  name: "search_files",
  description:
    "Searches for text content across files in the workspace. Automatically excludes node_modules, dist, .git, and sensitive files.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The text to search for (case-insensitive)",
      },
      file_pattern: {
        type: "string",
        description:
          "Optional glob pattern to filter files (e.g. '**/*.ts' for TypeScript files)",
      },
    },
    required: ["query"],
  },
  execute: async ({ query, file_pattern }) => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceRoot) throw new Error("No workspace folder open");

    const matches: Array<{ path: string; line: number; content: string }> = [];
    const MAX_RESULTS = 50;

    const pattern = file_pattern || "**/*";
    const files = await vscode.workspace.findFiles(pattern, EXCLUDE_PATTERN, 100);

    for (const file of files) {
      if (matches.length >= MAX_RESULTS) break;

      const relativePath = vscode.workspace.asRelativePath(file);
      if (isSensitivePath(relativePath)) continue;

      try {
        const data = await vscode.workspace.fs.readFile(file);
        const content = Buffer.from(data).toString("utf8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= MAX_RESULTS) break;

          if (lines[i].toLowerCase().includes(query.toLowerCase())) {
            matches.push({
              path: relativePath,
              line: i + 1,
              content: lines[i].trim().slice(0, 200),
            });
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return { query, matches, totalMatches: matches.length };
  },
});
