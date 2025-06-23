import { z } from "zod";

// Tool architecture inspired by opencode
export namespace Tool {
  export type Context = {
    abort: AbortSignal;
    workspaceRoot: string;
  };

  export interface Info<Parameters extends z.ZodSchema = z.ZodSchema> {
    id: string;
    description: string;
    parameters: Parameters;
    execute(
      args: z.infer<Parameters>,
      ctx: Context
    ): Promise<{
      metadata: Record<string, any>;
      output: string;
    }>;
  }

  export function define<Parameters extends z.ZodSchema>(
    input: Info<Parameters>
  ): Info<Parameters> {
    return input;
  }
}
