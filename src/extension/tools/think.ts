import { defineTool } from "./tool";

type ThinkArgs = {
  thought: string;
};

export const thinkTool = defineTool<ThinkArgs>({
  name: "think",
  description:
    "Use this tool to reason through complex problems, plan your approach, or organize your thoughts before taking action. This is your scratchpad for thinking.",
  parameters: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description:
          "Your reasoning, plan, or analysis. Use this to break down problems, evaluate options, or decide next steps.",
      },
    },
    required: ["thought"],
  },
  execute: async (args) => {
    // This tool doesn't do anything - it's a scratchpad for the model
    return { acknowledged: true };
  },
});
