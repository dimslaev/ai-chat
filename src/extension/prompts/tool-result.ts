export interface ToolResultOptions {
  toolName: string;
  result: string;
  success?: boolean;
}

// Tool execution result formatting
export function toolResult(options: ToolResultOptions): string {
  const { toolName, result, success = true } = options;
  const status = success ? "✓" : "✗";
  return `\n--- ${status} Tool: ${toolName} ---\n${result}\n---\n`;
}
