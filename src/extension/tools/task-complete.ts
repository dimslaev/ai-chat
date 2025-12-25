import { defineTool } from "./tool";

type TaskCompleteArgs = {
  summary: string;
};

export const taskCompleteTool = defineTool<TaskCompleteArgs>({
  name: "task_complete",
  description:
    "Call this tool when you have gathered all the necessary context to answer the user's question. Provide a brief summary of what you found.",
  parameters: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description:
          "Brief summary of the context gathered and key findings relevant to the user's question",
      },
    },
    required: ["summary"],
  },
  execute: async (args) => {
    // This tool doesn't do anything - it's a signal to stop the loop
    return { completed: true, summary: args.summary };
  },
});
