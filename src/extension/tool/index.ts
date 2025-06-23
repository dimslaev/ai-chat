import { z } from "zod";
import { Tool } from "./tool";
import { ReadTool } from "./read";
import { WriteTool } from "./write";
import { GrepTool } from "./grep";

// Export all tools
export { Tool, ReadTool, WriteTool, GrepTool };

// Tool registry
const ALL_TOOLS = [ReadTool, WriteTool, GrepTool] as const;

// OpenAI tool definition conversion
export function getOpenAIToolDefinitions() {
  return ALL_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.id,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters),
    },
  }));
}

function zodToJsonSchema(schema: z.ZodSchema): any {
  // Handle ZodObject specifically
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodTypeToJsonSchema(value as z.ZodType);

      // Check if field is required (not optional)
      if (!(value as any).isOptional()) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return zodTypeToJsonSchema(schema);
}

function zodTypeToJsonSchema(zodType: z.ZodType): any {
  if (zodType instanceof z.ZodString) {
    const schema: any = { type: "string" };
    if (zodType.description) {
      schema.description = zodType.description;
    }
    return schema;
  }

  if (zodType instanceof z.ZodNumber) {
    const schema: any = { type: "number" };
    if (zodType.description) {
      schema.description = zodType.description;
    }
    return schema;
  }

  if (zodType instanceof z.ZodBoolean) {
    const schema: any = { type: "boolean" };
    if (zodType.description) {
      schema.description = zodType.description;
    }
    return schema;
  }

  if (zodType instanceof z.ZodOptional) {
    return zodTypeToJsonSchema(zodType.unwrap());
  }

  // Fallback
  const schema: any = { type: "string" };
  if (zodType.description) {
    schema.description = zodType.description;
  }
  return schema;
}

// Tool executor class
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
