import { tool, zodSchema } from "ai";
import { z } from "zod";

import { State } from "@/extension/core/state";
import { Plan } from "@/lib/types";

/**
 * Built-in plan tools for task planning and tracking
 * These are merged with MCP tools in completion.ts
 */

const createPlanSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().describe("Unique identifier for the task"),
      description: z
        .string()
        .describe("Clear description of what this task will accomplish"),
    }),
  ),
});

const updatePlanSchema = z.object({
  taskId: z.string().describe("The ID of the task to update"),
  status: z
    .enum(["in_progress", "completed"])
    .describe("The new status for the task"),
});

type CreatePlan = z.infer<typeof createPlanSchema>;
type UpdatePlan = z.infer<typeof updatePlanSchema>;

export const createPlanTool = (onSetPlan: (plan: Plan | null) => void) =>
  tool({
    description:
      "Create a plan for complex tasks that require multiple steps. Use this when the user's request involves multiple operations or tools. The plan MUST be approved by the user before proceeding with execution.",
    inputSchema: zodSchema(createPlanSchema),
    execute: async (input: CreatePlan) => {
      const { tasks } = input;
      // Plan card appears after the message before the plan tool was called
      const messageId = State.history[State.history.length - 1]?.id;
      const plan: Plan = {
        id: `plan-${Date.now()}`,
        tasks: tasks.map((t) => ({ ...t, status: "pending" as const })),
        status: "awaiting_approval",
        messageId,
      };

      State.setPlan(plan);
      onSetPlan(plan);

      // Wait for user approval - this promise resolves when user clicks approve/reject
      const approved = await State.awaitPlanApproval();

      if (approved) {
        State.setPlan({ ...plan, status: "approved" });
        return {
          approved: true,
          message:
            "Plan approved by user. Proceed with executing the tasks in order.",
        };
      } else {
        State.setPlan(null);
        return {
          approved: false,
          message:
            "Plan rejected by user. Ask for clarification or propose a different approach.",
        };
      }
    },
  });

export const updatePlanTool = (onSetPlan: (plan: Plan | null) => void) =>
  tool({
    description:
      "Update the status of a task in the current plan. Call this when starting a task (in_progress) or after completing it (completed).",
    inputSchema: zodSchema(updatePlanSchema),
    execute: async (input: UpdatePlan) => {
      const { taskId, status } = input;
      const plan = State.plan;
      if (!plan) {
        return { error: "No active plan" };
      }

      const task = plan.tasks.find((t) => t.id === taskId);
      if (!task) {
        return { error: `Task with id "${taskId}" not found` };
      }

      task.status = status;

      // Check if all tasks are completed
      const allCompleted = plan.tasks.every((t) => t.status === "completed");
      if (allCompleted) {
        plan.status = "completed";
      } else if (plan.status === "approved") {
        plan.status = "in_progress";
      }

      State.setPlan({ ...plan });
      onSetPlan(plan);

      return { success: true, taskId, status };
    },
  });
