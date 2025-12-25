import OpenAI from "openai";

import { listDirectoryTool } from "./list-directory";
import { readFileTool } from "./read-file";
import { searchFilesTool } from "./search";
import { taskCompleteTool } from "./task-complete";
import { thinkTool } from "./think";
import { BaseTool } from "./tool";

export type ToolResult = { name: string; result: unknown; error?: string };

type ToolConfig = {
  toolReadFile?: boolean;
  toolListDirectory?: boolean;
  toolSearchFiles?: boolean;
};

// Tool registry by name for execution
const toolRegistry = new Map<string, BaseTool>([
  ["read_file", readFileTool],
  ["list_directory", listDirectoryTool],
  ["search_files", searchFilesTool],
  ["think", thinkTool],
  ["task_complete", taskCompleteTool],
]);

// Get enabled tools based on config
export function getEnabledTools(
  config: ToolConfig,
): OpenAI.ChatCompletionTool[] {
  const enabled: BaseTool[] = [];

  if (config.toolListDirectory !== false) enabled.push(listDirectoryTool);
  if (config.toolReadFile !== false) enabled.push(readFileTool);
  if (config.toolSearchFiles !== false) enabled.push(searchFilesTool);

  // Always include think and task_complete when any tools are enabled
  if (enabled.length > 0) {
    enabled.push(thinkTool);
    enabled.push(taskCompleteTool);
  }

  return enabled.map((t) => t.toOpenAI());
}

// Execute a tool call
export async function executeToolCall(call: {
  name: string;
  arguments: Record<string, unknown>;
}) {
  const tool = toolRegistry.get(call.name);

  if (!tool) {
    return {
      name: call.name,
      result: null,
      error: `Unknown tool: ${call.name}`,
    };
  }

  try {
    console.log("[Tool] Executing:", call.name, call.arguments);
    const result = await tool.execute(call.arguments);
    console.log("[Tool] Result:", call.name, result);
    return { name: call.name, result };
  } catch (error) {
    return {
      name: call.name,
      result: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Re-export for external use
export { listDirectoryTool } from "./list-directory";
export { readFileTool } from "./read-file";
export { searchFilesTool } from "./search";
export { taskCompleteTool } from "./task-complete";
export { thinkTool } from "./think";
export { BaseTool, defineTool } from "./tool";
