import { Tool } from "ai";

import { listDirectoryTool } from "./list-directory";
import { readFileTool } from "./read-file";
import { searchFilesTool } from "./search";

type ToolConfig = {
  toolReadFile?: boolean;
  toolListDirectory?: boolean;
  toolSearchFiles?: boolean;
};

type AnyTool = Tool<any, any>;

// Get enabled tools based on config
export function getEnabledTools(config: ToolConfig): Record<string, AnyTool> {
  const tools: Record<string, AnyTool> = {};

  if (config.toolListDirectory !== false) {
    tools["list_directory"] = listDirectoryTool;
  }
  if (config.toolReadFile !== false) {
    tools["read_file"] = readFileTool;
  }
  if (config.toolSearchFiles !== false) {
    tools["search_files"] = searchFilesTool;
  }

  return tools;
}

// Re-export for external use
export { listDirectoryTool } from "./list-directory";
export { readFileTool } from "./read-file";
export { searchFilesTool } from "./search";
