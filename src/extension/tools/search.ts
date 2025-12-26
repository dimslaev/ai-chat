import { tool } from "ai";
import * as vscode from "vscode";
import { z } from "zod";

import { EXCLUDE_PATTERN, isSensitivePath } from "./safety";

const inputSchema = z.object({
  query: z
    .string()
    .describe(
      "Search term(s). Use comma-separated values for multiple queries (e.g. 'useState,useEffect' or 'handleSubmit,onSubmit')",
    ),
  file_pattern: z
    .string()
    .optional()
    .describe(
      "Glob pattern(s) to filter files. Use comma-separated for multiple (e.g. '**/*.ts,**/*.tsx' or 'src/components/**/*,src/hooks/**/*')",
    ),
  match_mode: z
    .enum(["any", "all"])
    .optional()
    .describe(
      "When using multiple queries: 'any' matches lines with at least one query, 'all' matches lines containing all queries. Default: 'any'",
    ),
});

export const searchFilesTool = tool({
  description:
    "Searches for text content across files in the workspace. Supports multiple queries and file patterns. Automatically excludes node_modules, dist, .git, and sensitive files.",
  inputSchema,
  execute: async ({ query, file_pattern, match_mode = "any" }) => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceRoot) throw new Error("No workspace folder open");

    // Parse queries (support both array and comma-separated string)
    const queries = query.split(",").map((q: string) => q.trim().toLowerCase());

    // Parse file patterns
    const patterns = file_pattern
      ? file_pattern.split(",").map((p: string) => p.trim())
      : ["**/*"];

    const fileMatches: Map<
      string,
      { count: number; lines: number[]; preview: string }
    > = new Map();
    const MAX_FILES = 20;
    const seenFiles = new Set<string>();

    // Search across all patterns
    for (const pattern of patterns) {
      if (fileMatches.size >= MAX_FILES) break;

      const files = await vscode.workspace.findFiles(
        pattern,
        EXCLUDE_PATTERN,
        100,
      );

      for (const file of files) {
        if (fileMatches.size >= MAX_FILES) break;

        const relativePath = vscode.workspace.asRelativePath(file);
        if (seenFiles.has(relativePath) || isSensitivePath(relativePath))
          continue;
        seenFiles.add(relativePath);

        try {
          const data = await vscode.workspace.fs.readFile(file);
          const content = Buffer.from(data).toString("utf8");
          const lines = content.split("\n");

          const matchedLines: number[] = [];
          let firstMatch = "";

          for (let i = 0; i < lines.length; i++) {
            const lineLower = lines[i].toLowerCase();
            const matchedQueries = queries.filter((q: string) =>
              lineLower.includes(q),
            );

            const isMatch =
              match_mode === "all"
                ? matchedQueries.length === queries.length
                : matchedQueries.length > 0;

            if (isMatch) {
              matchedLines.push(i + 1);
              if (!firstMatch) {
                firstMatch = lines[i].trim().slice(0, 100);
              }
            }
          }

          if (matchedLines.length > 0) {
            fileMatches.set(relativePath, {
              count: matchedLines.length,
              lines: matchedLines.slice(0, 5), // First 5 line numbers
              preview: firstMatch,
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    // Convert to array sorted by match count
    const results = Array.from(fileMatches.entries())
      .map(([path, data]) => ({ path, ...data }))
      .sort((a, b) => b.count - a.count);

    return {
      queries,
      patterns,
      match_mode,
      files: results,
      totalFiles: results.length,
    };
  },
});
