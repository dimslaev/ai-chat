import * as vscode from "vscode";
import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";

const DESCRIPTION = `- Read file contents with optional line range support
- Files are resolved relative to the workspace root
- Supports offset and limit parameters for reading specific line ranges
- Automatically suggests similar files if the requested file is not found
- Auto-selects the most likely file when there's only one suggestion
- Handles large files by truncating long lines to prevent overwhelming output
- Use this tool when you need to examine file contents or understand code structure
- For searching within files, use the grep tool instead`;

export const ReadTool = Tool.define({
  id: "read_file",
  description: DESCRIPTION,
  parameters: z.object({
    filePath: z
      .string()
      .describe(
        "The path to the file to read, relative to the workspace root (e.g., 'src/file.js' or 'server/test-files/database.js')"
      ),
    offset: z
      .number()
      .describe("The line number to start reading from (0-based)")
      .optional(),
    limit: z
      .number()
      .describe("The number of lines to read (defaults to 2000)")
      .optional(),
  }),
  async execute(params, ctx) {
    const MAX_READ_SIZE = 250 * 1024;
    const DEFAULT_READ_LIMIT = 2000;
    const MAX_LINE_LENGTH = 2000;

    let filePath = params.filePath;
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(ctx.workspaceRoot, filePath);
    }

    const uri = vscode.Uri.file(filePath);

    try {
      const stat = await vscode.workspace.fs.stat(uri);

      if (stat.size > MAX_READ_SIZE) {
        throw new Error(
          `File is too large (${stat.size} bytes). Maximum size is ${MAX_READ_SIZE} bytes`
        );
      }

      const fileData = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(fileData).toString("utf8");

      const limit = params.limit ?? DEFAULT_READ_LIMIT;
      const offset = params.offset || 0;

      const lines = content.split("\n");
      const raw = lines.slice(offset, offset + limit).map((line) => {
        return line.length > MAX_LINE_LENGTH
          ? line.substring(0, MAX_LINE_LENGTH) + "..."
          : line;
      });

      const numbered = raw.map((line, index) => {
        return `${(index + offset + 1).toString().padStart(5, "0")}| ${line}`;
      });

      let output = "<file>\n";
      output += numbered.join("\n");

      if (lines.length > offset + numbered.length) {
        output += `\n\n(File has more lines. Use 'offset' parameter to read beyond line ${
          offset + numbered.length
        })`;
      }
      output += "\n</file>";

      const preview = raw.slice(0, 20).join("\n");

      return {
        output,
        metadata: {
          preview,
          title: path.relative(ctx.workspaceRoot, filePath),
        },
      };
    } catch (error) {
      if (
        error instanceof vscode.FileSystemError &&
        error.code === "FileNotFound"
      ) {
        const base = path.basename(filePath);
        const suggestions: string[] = [];

        // Search for files with similar names in the workspace
        try {
          // First try exact filename matches anywhere in workspace
          const exactPattern = new vscode.RelativePattern(
            ctx.workspaceRoot,
            `**/${base}`
          );
          const exactMatches = await vscode.workspace.findFiles(
            exactPattern,
            null,
            10
          );

          if (exactMatches.length > 0) {
            // Sort exact matches by path similarity (prefer shorter paths)
            const sortedMatches = exactMatches
              .map((uri) => ({
                path: path.relative(ctx.workspaceRoot, uri.fsPath),
                uri,
              }))
              .sort((a, b) => {
                // Prefer files in current directory or parent directories
                const requestedDir = path.dirname(params.filePath);
                const aInRequested = a.path.startsWith(requestedDir);
                const bInRequested = b.path.startsWith(requestedDir);

                if (aInRequested && !bInRequested) return -1;
                if (!aInRequested && bInRequested) return 1;

                // Otherwise prefer shorter paths
                return a.path.length - b.path.length;
              });

            suggestions.push(...sortedMatches.map((m) => m.path));
          } else {
            // If no exact matches, try partial matches (same name without extension)
            const baseName = path.parse(base).name;
            const partialPattern = new vscode.RelativePattern(
              ctx.workspaceRoot,
              `**/*${baseName}*`
            );
            const partialMatches = await vscode.workspace.findFiles(
              partialPattern,
              null,
              5
            );
            suggestions.push(
              ...partialMatches.map((uri) =>
                path.relative(ctx.workspaceRoot, uri.fsPath)
              )
            );
          }
        } catch {
          // Fallback to directory search if workspace search fails
          try {
            const dir = path.dirname(filePath);
            const dirUri = vscode.Uri.file(dir);
            const dirEntries = await vscode.workspace.fs.readDirectory(dirUri);
            const dirSuggestions = dirEntries
              .filter(
                ([entry]) =>
                  entry.toLowerCase().includes(base.toLowerCase()) ||
                  base.toLowerCase().includes(entry.toLowerCase())
              )
              .map(([entry]) =>
                path.relative(ctx.workspaceRoot, path.join(dir, entry))
              )
              .slice(0, 3);
            suggestions.push(...dirSuggestions);
          } catch {
            // Ignore directory read errors
          }
        }

        if (suggestions.length > 0) {
          // If there's exactly one suggestion, automatically use it
          if (suggestions.length === 1) {
            const suggestedPath = path.resolve(
              ctx.workspaceRoot,
              suggestions[0]
            );
            console.log(
              `Auto-selecting: ${suggestions[0]} for ${params.filePath}`
            );

            try {
              const uri = vscode.Uri.file(suggestedPath);
              const fileData = await vscode.workspace.fs.readFile(uri);
              const content = Buffer.from(fileData).toString("utf8");

              // Apply the same processing as above
              const autoOffset = params.offset || 0;
              const autoLimit = params.limit || DEFAULT_READ_LIMIT;

              const lines = content.split("\n");
              const raw = lines
                .slice(autoOffset, autoOffset + autoLimit)
                .map((line) => {
                  return line.length > MAX_LINE_LENGTH
                    ? line.substring(0, MAX_LINE_LENGTH) + "..."
                    : line;
                });

              const numbered = raw.map((line, index) => {
                return `${(index + autoOffset + 1)
                  .toString()
                  .padStart(5, "0")}| ${line}`;
              });

              let output = `<file path="${suggestions[0]}">\n`;
              output += `Note: File '${params.filePath}' not found, showing '${suggestions[0]}' instead.\n\n`;
              output += numbered.join("\n");

              if (lines.length > autoOffset + numbered.length) {
                output += `\n\n(File has more lines. Use 'offset' parameter to read beyond line ${
                  autoOffset + numbered.length
                })`;
              }
              output += "\n</file>";

              const preview = raw.slice(0, 20).join("\n");

              return {
                output,
                metadata: {
                  preview,
                  title: suggestions[0],
                  autoSelected: true,
                  originalPath: params.filePath,
                },
              };
            } catch (autoReadError) {
              // If auto-read fails, fall back to showing suggestions
              throw new Error(
                `File not found: ${params.filePath}\n\nFound similar file '${
                  suggestions[0]
                }' but failed to read it: ${
                  autoReadError instanceof Error
                    ? autoReadError.message
                    : String(autoReadError)
                }`
              );
            }
          }

          // Multiple suggestions - ask user to choose
          throw new Error(
            `File not found: ${
              params.filePath
            }\n\nDid you mean one of these?\n${suggestions
              .slice(0, 5)
              .join("\n")}`
          );
        }

        throw new Error(
          `File not found: ${params.filePath}. Make sure the file path is correct relative to the workspace root.`
        );
      }
      throw new Error(
        `Failed to read file ${params.filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});
