import OpenAI from "openai";

type JsonSchemaProperty = {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
  default?: unknown;
};

type ToolParameters = {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
};

// Base tool interface for registry (uses unknown args)
export interface BaseTool {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
  toOpenAI: () => OpenAI.ChatCompletionTool;
}

export function defineTool<T extends Record<string, unknown>>(config: {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute: (args: T) => Promise<unknown>;
}): BaseTool {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: config.execute as (
      args: Record<string, unknown>,
    ) => Promise<unknown>,
    toOpenAI: () => ({
      type: "function",
      function: {
        name: config.name,
        description: config.description,
        parameters: config.parameters,
      },
    }),
  };
}
