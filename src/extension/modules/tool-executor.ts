import { ALL_TOOLS, Tool } from "../tool";

export class ToolExecutor {
  private workspaceRoot: string;
  private toolMap: Map<string, Tool.Info>;

  constructor() {
    this.workspaceRoot = "";
    this.toolMap = new Map();

    // Register all tools
    for (const tool of ALL_TOOLS) {
      this.toolMap.set(tool.id, tool);
    }
  }

  setWorkspaceRoot(root: string) {
    this.workspaceRoot = root;
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  async executeToolCall(
    toolCallId: string,
    functionName: string,
    args: any,
    abortSignal: AbortSignal
  ): Promise<{ tool_call_id: string; content: string }> {
    const tool = this.toolMap.get(functionName);
    if (!tool) {
      return {
        tool_call_id: toolCallId,
        content: `Unknown tool: ${functionName}`,
      };
    }

    try {
      const context: Tool.Context = {
        abort: abortSignal,
        workspaceRoot: this.workspaceRoot,
      };

      const result = await tool.execute(args, context);
      return {
        tool_call_id: toolCallId,
        content: result.output,
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
}
