import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { z } from "zod";
import { spawn } from "child_process";
import { Tool } from "./tool";

const DESCRIPTION = `- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (e.g. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (e.g. "*.js", "*.{ts,tsx}")
- Returns file paths with matching lines sorted by modification time
- Uses ripgrep (rg) if available, falls back to JavaScript search if not
- Use this tool when you need to find files containing specific patterns
- Results are limited to 100 matches to prevent overwhelming output`;

interface SearchMatch {
  path: string;
  modTime: number;
  lineNum: number;
  lineText: string;
}

export const GrepTool = Tool.define({
  id: "grep",
  description: DESCRIPTION,
  parameters: z.object({
    pattern: z
      .string()
      .describe("The regex pattern to search for in file contents"),
    path: z
      .string()
      .optional()
      .describe("The directory to search in. Defaults to the workspace root."),
    include: z
      .string()
      .optional()
      .describe(
        'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")'
      ),
  }),
  async execute(params, ctx) {
    if (!params.pattern) {
      throw new Error("pattern is required");
    }

    const searchPath = params.path
      ? path.resolve(ctx.workspaceRoot, params.path)
      : ctx.workspaceRoot;

    // Try to use ripgrep if available, fallback to simple search
    try {
      const matches = await searchWithRipgrep(
        params.pattern,
        searchPath,
        params.include
      );
      return formatSearchResults(matches, params.pattern);
    } catch (error) {
      // Fallback to simple file search if ripgrep is not available
      console.warn("Ripgrep not available, using fallback search:", error);
      const matches = await searchWithFallback(
        params.pattern,
        searchPath,
        params.include
      );
      return formatSearchResults(matches, params.pattern);
    }
  },
});

// Helper functions for grep
async function searchWithRipgrep(
  pattern: string,
  searchPath: string,
  include?: string
): Promise<SearchMatch[]> {
  return new Promise((resolve, reject) => {
    const args = ["-n", pattern];
    if (include) {
      args.push("--glob", include);
    }
    args.push(searchPath);

    const proc = spawn("rg", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code: number) => {
      if (code === 1) {
        // No matches found
        resolve([]);
        return;
      }

      if (code !== 0) {
        reject(new Error(`ripgrep failed: ${errorOutput}`));
        return;
      }

      const matches: SearchMatch[] = [];
      const lines = output.trim().split("\n");

      for (const line of lines) {
        if (!line) continue;

        const parts = line.split(":", 3);
        if (parts.length < 3) continue;

        const filePath = parts[0];
        const lineNum = parseInt(parts[1], 10);
        const lineText = parts[2];

        try {
          const stat = fs.statSync(filePath);
          matches.push({
            path: filePath,
            modTime: stat.mtime.getTime(),
            lineNum,
            lineText,
          });
        } catch {
          // Skip files that can't be stat'd
        }
      }

      matches.sort((a, b) => b.modTime - a.modTime);
      resolve(matches);
    });

    proc.on("error", (err: Error) => {
      reject(err);
    });
  });
}

async function searchWithFallback(
  pattern: string,
  searchPath: string,
  include?: string
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];
  const regex = new RegExp(pattern, "gi");

  async function searchInDirectory(dirPath: string) {
    const uri = vscode.Uri.file(dirPath);
    try {
      const entries = await vscode.workspace.fs.readDirectory(uri);

      for (const [name, type] of entries) {
        const fullPath = path.join(dirPath, name);

        if (type === vscode.FileType.Directory) {
          await searchInDirectory(fullPath);
        } else if (type === vscode.FileType.File) {
          // Apply include filter
          if (include && !matchesGlob(name, include)) {
            continue;
          }

          try {
            const fileUri = vscode.Uri.file(fullPath);
            const stat = await vscode.workspace.fs.stat(fileUri);
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(fileData).toString("utf8");
            const lines = content.split("\n");

            lines.forEach((line, index) => {
              if (regex.test(line)) {
                matches.push({
                  path: fullPath,
                  modTime: stat.mtime,
                  lineNum: index + 1,
                  lineText: line,
                });
              }
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  await searchInDirectory(searchPath);
  matches.sort((a, b) => b.modTime - a.modTime);
  return matches;
}

function matchesGlob(filename: string, pattern: string): boolean {
  // Simple glob matching - convert to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  const regex = new RegExp(`^${regexPattern}$`, "i");
  return regex.test(filename);
}

function formatSearchResults(matches: SearchMatch[], pattern: string) {
  const limit = 100;
  const truncated = matches.length > limit;
  const finalMatches = truncated ? matches.slice(0, limit) : matches;

  if (finalMatches.length === 0) {
    return {
      metadata: { matches: 0, truncated: false, title: pattern },
      output: "No files found",
    };
  }

  const outputLines = [`Found ${finalMatches.length} matches`];

  let currentFile = "";
  for (const match of finalMatches) {
    if (currentFile !== match.path) {
      if (currentFile !== "") {
        outputLines.push("");
      }
      currentFile = match.path;
      outputLines.push(`${match.path}:`);
    }
    outputLines.push(`  Line ${match.lineNum}: ${match.lineText}`);
  }

  if (truncated) {
    outputLines.push("");
    outputLines.push(
      "(Results are truncated. Consider using a more specific path or pattern.)"
    );
  }

  return {
    metadata: {
      matches: finalMatches.length,
      truncated,
      title: pattern,
    },
    output: outputLines.join("\n"),
  };
}
