import { z } from "zod";
import { Tool } from "./tool";
import * as vscode from "vscode";
import * as path from "path";

const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".idea",
  ".vscode",
  "__pycache__",
  ".next",
  ".nuxt",
];

export const ListDirTool = Tool.define({
  id: "list_dir",
  description:
    "List directory contents with intelligent filtering for project exploration",
  parameters: z.object({
    path: z
      .string()
      .describe("The directory path to list (relative to workspace root)"),
    recursive: z.boolean().optional().describe("Whether to list recursively"),
    maxDepth: z
      .number()
      .optional()
      .describe("Maximum depth for recursive listing"),
    includeHidden: z
      .boolean()
      .optional()
      .describe("Whether to include hidden files"),
  }),
  async execute(params, ctx) {
    const workspaceRoot = ctx.workspaceRoot;
    const targetPath = path.isAbsolute(params.path)
      ? params.path
      : path.join(workspaceRoot, params.path);

    try {
      const uri = vscode.Uri.file(targetPath);
      const stat = await vscode.workspace.fs.stat(uri);

      if (stat.type !== vscode.FileType.Directory) {
        throw new Error(`Path is not a directory: ${targetPath}`);
      }

      const structure = await listDirectory(
        uri,
        params.recursive || false,
        params.maxDepth || 3,
        params.includeHidden || false
      );

      const output = formatDirectoryStructure(
        structure,
        path.relative(workspaceRoot, targetPath)
      );

      return {
        metadata: {
          path: targetPath,
          itemCount: countItems(structure),
          title: path.relative(workspaceRoot, targetPath) || "Root",
        },
        output,
      };
    } catch (error) {
      throw new Error(
        `Failed to list directory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

interface DirectoryItem {
  name: string;
  type: "file" | "directory";
  children?: DirectoryItem[];
  size?: number;
  modified?: number;
}

async function listDirectory(
  uri: vscode.Uri,
  recursive: boolean,
  maxDepth: number,
  includeHidden: boolean,
  currentDepth = 0
): Promise<DirectoryItem[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const entries = await vscode.workspace.fs.readDirectory(uri);
  const items: DirectoryItem[] = [];

  for (const [name, type] of entries) {
    // Skip ignored patterns
    if (IGNORE_PATTERNS.some((pattern) => name.includes(pattern))) {
      continue;
    }

    // Skip hidden files unless requested
    if (!includeHidden && name.startsWith(".")) {
      continue;
    }

    const itemUri = vscode.Uri.joinPath(uri, name);

    try {
      const stat = await vscode.workspace.fs.stat(itemUri);
      const item: DirectoryItem = {
        name,
        type: type === vscode.FileType.Directory ? "directory" : "file",
        size: stat.size,
        modified: stat.mtime,
      };

      if (recursive && type === vscode.FileType.Directory) {
        item.children = await listDirectory(
          itemUri,
          recursive,
          maxDepth,
          includeHidden,
          currentDepth + 1
        );
      }

      items.push(item);
    } catch (error) {
      // Skip items we can't access
      continue;
    }
  }

  // Sort: directories first, then files, both alphabetically
  return items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

function formatDirectoryStructure(
  items: DirectoryItem[],
  basePath: string
): string {
  let output = `📁 ${basePath || "Project Root"}\n`;

  function renderItems(items: DirectoryItem[], indent = ""): string {
    let result = "";

    for (const item of items) {
      const icon = item.type === "directory" ? "📁" : "📄";
      result += `${indent}${icon} ${item.name}`;

      if (item.type === "file" && item.size) {
        result += ` (${formatFileSize(item.size)})`;
      }

      result += "\n";

      if (item.children && item.children.length > 0) {
        result += renderItems(item.children, indent + "  ");
      }
    }

    return result;
  }

  output += renderItems(items);
  return output;
}

function countItems(items: DirectoryItem[]): number {
  let count = items.length;
  for (const item of items) {
    if (item.children) {
      count += countItems(item.children);
    }
  }
  return count;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
