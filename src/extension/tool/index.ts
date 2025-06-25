import { z } from "zod";
import { Tool } from "./tool";
import { ReadTool } from "./read";
import { WriteTool } from "./write";
import { GrepTool } from "./grep";
import { ListDirTool } from "./list-dir";
import { AnalyzeASTTool } from "./ast-analysis";
import { TaskTool } from "./task";
import { TodoWriteTool, TodoReadTool } from "./todo";

export {
  Tool,
  ReadTool,
  WriteTool,
  GrepTool,
  ListDirTool,
  AnalyzeASTTool,
  TaskTool,
  TodoWriteTool,
  TodoReadTool,
};

export const ALL_TOOLS = [
  ReadTool,
  WriteTool,
  GrepTool,
  ListDirTool,
  AnalyzeASTTool,
  TaskTool,
  TodoWriteTool,
  TodoReadTool,
] as const;

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
