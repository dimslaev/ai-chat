import { z } from "zod";
import { Tool } from "./tool";
import * as path from "path";
import {
  readDirectory,
  getFileStat,
  getRelativePath,
  resolveWorkspacePath,
  formatFileSize,
} from "./utils";

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
    const targetPath = resolveWorkspacePath(params.path, workspaceRoot);

    try {
      const stat = await getFileStat(params.path, workspaceRoot);

      if (stat.type !== 2) {
        // vscode.FileType.Directory = 2
        throw new Error(`Path is not a directory: ${targetPath}`);
      }

      const structure = await listDirectoryStructure(
        params.path,
        workspaceRoot,
        params.recursive || false,
        params.maxDepth || 3,
        params.includeHidden || false
      );

      const output = formatDirectoryStructure(
        structure,
        getRelativePath(targetPath, workspaceRoot)
      );

      return {
        metadata: {
          path: targetPath,
          itemCount: countItems(structure),
          title: getRelativePath(targetPath, workspaceRoot) || "Root",
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

async function listDirectoryStructure(
  dirPath: string,
  workspaceRoot: string,
  recursive: boolean,
  maxDepth: number,
  includeHidden: boolean,
  currentDepth = 0
): Promise<DirectoryItem[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const entries = await readDirectory(dirPath, workspaceRoot);
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

    const itemPath = path.join(dirPath, name);

    try {
      const stat = await getFileStat(itemPath, workspaceRoot);
      const item: DirectoryItem = {
        name,
        type: type === 2 ? "directory" : "file", // vscode.FileType.Directory = 2
        size: stat.size,
        modified: stat.mtime,
      };

      if (recursive && type === 2) {
        // vscode.FileType.Directory = 2
        item.children = await listDirectoryStructure(
          itemPath,
          workspaceRoot,
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

// formatFileSize is now imported from utils
