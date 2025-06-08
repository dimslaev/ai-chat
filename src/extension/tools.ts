import * as vscode from "vscode";
import * as path from "path";
import { z } from "zod";
import { ToolDefinition, FileInfo, ToolExecutionResult } from "../types";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description:
              "The path to the file to read, relative to the workspace root",
          },
        },
        required: ["file_path"],
      },
    },
  },
  // {
  //   type: "function",
  //   function: {
  //     name: "write_file",
  //     description: "Write content to a file",
  //     parameters: {
  //       type: "object",
  //       properties: {
  //         file_path: {
  //           type: "string",
  //           description:
  //             "The path to the file to write, relative to the workspace root",
  //         },
  //         content: {
  //           type: "string",
  //           description: "The content to write to the file",
  //         },
  //       },
  //       required: ["file_path", "content"],
  //     },
  //   },
  // },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List the contents of a directory",
      parameters: {
        type: "object",
        properties: {
          directory_path: {
            type: "string",
            description:
              "The path to the directory to list, relative to the workspace root. Use '.' for workspace root.",
          },
        },
        required: ["directory_path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_file_info",
      description: "Get information about a file or directory",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description:
              "The path to the file or directory, relative to the workspace root",
          },
        },
        required: ["file_path"],
      },
    },
  },
];

export class ToolExecutor {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
  }

  async executeToolCall(
    toolCallId: string,
    functionName: string,
    args: any
  ): Promise<ToolExecutionResult> {
    try {
      let result: string;

      switch (functionName) {
        case "read_file":
          result = await this.readFile(args.file_path);
          break;
        // case "write_file":
        //   result = await this.writeFile(args.file_path, args.content);
        //   break;
        case "list_directory":
          result = await this.listDirectory(args.directory_path);
          break;
        case "get_file_info":
          result = await this.getFileInfo(args.file_path);
          break;
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }

      return {
        tool_call_id: toolCallId,
        content: result,
      };
    } catch (error) {
      return {
        tool_call_id: toolCallId,
        content: `Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // classifyRequest method removed - now using structured output with Zod

  private async readFile(filePath: string): Promise<string> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    const uri = vscode.Uri.file(fullPath);

    try {
      const fileData = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(fileData).toString("utf8");
    } catch (error) {
      throw new Error(
        `Failed to read file ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // private async writeFile(filePath: string, content: string): Promise<string> {
  //   const fullPath = path.resolve(this.workspaceRoot, filePath);
  //   const uri = vscode.Uri.file(fullPath);

  //   try {
  //     const encoder = new TextEncoder();
  //     await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
  //     return `Successfully wrote to ${filePath}`;
  //   } catch (error) {
  //     throw new Error(
  //       `Failed to write file ${filePath}: ${
  //         error instanceof Error ? error.message : String(error)
  //       }`
  //     );
  //   }
  // }

  private async listDirectory(directoryPath: string): Promise<string> {
    const fullPath = path.resolve(this.workspaceRoot, directoryPath);
    const uri = vscode.Uri.file(fullPath);

    try {
      const entries = await vscode.workspace.fs.readDirectory(uri);
      const fileInfos: FileInfo[] = [];

      for (const [name, type] of entries) {
        const entryPath = path.join(directoryPath, name);
        const entryUri = vscode.Uri.file(
          path.resolve(this.workspaceRoot, entryPath)
        );

        let size: number | undefined;
        if (type === vscode.FileType.File) {
          try {
            const stat = await vscode.workspace.fs.stat(entryUri);
            size = stat.size;
          } catch {
            // Ignore stat errors
          }
        }

        fileInfos.push({
          name,
          path: entryPath,
          type: type === vscode.FileType.Directory ? "directory" : "file",
          size,
        });
      }

      return JSON.stringify(fileInfos, null, 2);
    } catch (error) {
      throw new Error(
        `Failed to list directory ${directoryPath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async getFileInfo(filePath: string): Promise<string> {
    const fullPath = path.resolve(this.workspaceRoot, filePath);
    const uri = vscode.Uri.file(fullPath);

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      const fileInfo: FileInfo = {
        name: path.basename(filePath),
        path: filePath,
        type: stat.type === vscode.FileType.Directory ? "directory" : "file",
        size: stat.type === vscode.FileType.File ? stat.size : undefined,
      };

      return JSON.stringify(fileInfo, null, 2);
    } catch (error) {
      throw new Error(
        `Failed to get file info for ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export const Classification = z.object({
  category: z.enum([
    "code_generation",
    "code_refactoring",
    "testing",
    "debugging",
    "documentation",
    "general",
  ]),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
});
