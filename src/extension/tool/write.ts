import * as vscode from "vscode";
import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";

const DESCRIPTION = `- Write content to files with automatic directory creation
- Files are created relative to the workspace root
- Overwrites existing files completely (not appending)
- Creates parent directories automatically if they don't exist
- Use this tool when you need to create new files or completely replace existing ones
- For partial edits or modifications, consider reading the file first and then writing the modified content`;

export const WriteTool = Tool.define({
  id: "write_file",
  description: DESCRIPTION,
  parameters: z.object({
    filePath: z
      .string()
      .describe(
        "The path to the file to write, relative to the workspace root"
      ),
    content: z.string().describe("The content to write to the file"),
  }),
  async execute(params, ctx) {
    let filePath = params.filePath;
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(ctx.workspaceRoot, filePath);
    }

    const uri = vscode.Uri.file(filePath);

    try {
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(params.content));

      return {
        output: `Successfully wrote ${params.content.length} characters to ${params.filePath}`,
        metadata: {
          title: path.relative(ctx.workspaceRoot, filePath),
          size: params.content.length,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to write file ${params.filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});
