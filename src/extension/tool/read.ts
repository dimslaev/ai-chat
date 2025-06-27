import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";
import {
  readFileContent,
  getFileStat,
  getRelativePath,
  resolveWorkspacePath,
  findFiles,
  readDirectory,
} from "./utils";

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

    try {
      const stat = await getFileStat(params.filePath, ctx.workspaceRoot);

      if (stat.size > MAX_READ_SIZE) {
        throw new Error(
          `File is too large (${stat.size} bytes). Maximum size is ${MAX_READ_SIZE} bytes`
        );
      }

      const content = await readFileContent(params.filePath, ctx.workspaceRoot);

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
          title: getRelativePath(params.filePath, ctx.workspaceRoot),
        },
      };
    } catch (error: any) {
      if (
        error.code === "FileNotFound" ||
        error.message?.includes("not found")
      ) {
        const base = path.basename(params.filePath);
        const suggestions: string[] = [];

        // Search for files with similar names in the workspace
        try {
          // First try exact filename matches anywhere in workspace
          const exactMatches = await findFiles(
            `**/${base}`,
            ctx.workspaceRoot,
            10
          );

          if (exactMatches.length > 0) {
            // Sort exact matches by path similarity (prefer shorter paths)
            const sortedMatches = exactMatches
              .map((filePath) => ({ path: filePath }))
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
            const partialMatches = await findFiles(
              `**/*${baseName}*`,
              ctx.workspaceRoot,
              5
            );
            suggestions.push(...partialMatches);
          }
        } catch {
          // Fallback to directory search if workspace search fails
          try {
            const dir = path.dirname(params.filePath);
            const dirEntries = await readDirectory(dir, ctx.workspaceRoot);
            const dirSuggestions = dirEntries
              .filter(
                ([entry]) =>
                  entry.toLowerCase().includes(base.toLowerCase()) ||
                  base.toLowerCase().includes(entry.toLowerCase())
              )
              .map(([entry]) =>
                getRelativePath(path.join(dir, entry), ctx.workspaceRoot)
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
            console.log(
              `Auto-selecting: ${suggestions[0]} for ${params.filePath}`
            );

            try {
              const content = await readFileContent(
                suggestions[0],
                ctx.workspaceRoot
              );

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
