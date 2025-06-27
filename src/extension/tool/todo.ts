import { z } from "zod";
import { Tool } from "./tool";
import { App } from "../modules/app";

const TodoInfo = z.object({
  content: z.string().min(1).describe("Brief description of the task"),
  status: z
    .enum(["pending", "in_progress", "completed"])
    .describe("Current status of the task"),
  priority: z
    .enum(["high", "medium", "low"])
    .describe("Priority level of the task"),
  id: z.string().describe("Unique identifier for the todo item"),
});
type TodoInfo = z.infer<typeof TodoInfo>;

const WRITE_DESCRIPTION = `Create and manage a structured task list for your current coding session.

Use this tool proactively in these scenarios:
- Complex multi-step tasks requiring 3 or more distinct steps
- Non-trivial and complex tasks requiring careful planning
- When user explicitly requests todo list management
- When user provides multiple tasks to track
- After receiving new instructions to capture requirements
- After completing tasks to mark them complete and add follow-ups
- When starting work on a task (mark as in_progress)

Task States:
- pending: Task not yet started
- in_progress: Currently working on (limit to ONE at a time)
- completed: Task finished successfully

Best Practices:
- Create specific, actionable items
- Break complex tasks into manageable steps
- Only have ONE task in_progress at any time
- Complete current tasks before starting new ones
- Update status in real-time as you work`;

const READ_DESCRIPTION = `Read the current todo list for the session.

Use this tool frequently to:
- Check pending tasks at conversation start
- Prioritize work before starting new tasks
- Review progress after completing tasks
- Stay on track with planned work
- Understand what's left to do

This tool takes no parameters and returns the current todo list with status and priority information.`;

export const TodoWriteTool = Tool.define({
  id: "todo_write",
  description: WRITE_DESCRIPTION,
  parameters: z.object({
    todos: z.array(TodoInfo).describe("The updated todo list"),
  }),
  async execute(params, ctx) {
    // Clear existing todos and add new ones
    App.state().todos = [];

    for (const todo of params.todos) {
      const id = App.addTodo(todo.content);
      if (todo.status !== "pending") {
        App.updateTodoStatus(id, todo.status);
      }
    }

    const todos = App.getTodos();
    const pendingCount = todos.filter((x) => x.status !== "completed").length;
    const completedCount = todos.filter((x) => x.status === "completed").length;
    const inProgressCount = todos.filter(
      (x) => x.status === "in_progress"
    ).length;

    return {
      output: `Todo list updated successfully!

Summary:
- ${pendingCount} pending tasks
- ${inProgressCount} in progress
- ${completedCount} completed tasks

Current todos:
${JSON.stringify(
  todos.map((t) => ({
    id: t.id,
    content: t.description,
    status: t.status,
    created: new Date(t.created).toISOString(),
    updated: new Date(t.updated).toISOString(),
  })),
  null,
  2
)}`,
      metadata: {
        title: `${pendingCount} todos`,
        todos: todos,
        pendingCount,
        completedCount,
        inProgressCount,
      },
    };
  },
});

export const TodoReadTool = Tool.define({
  id: "todo_read",
  description: READ_DESCRIPTION,
  parameters: z.object({}),
  async execute(_params, ctx) {
    const todos = App.getTodos();
    const pendingCount = todos.filter((x) => x.status !== "completed").length;
    const completedCount = todos.filter((x) => x.status === "completed").length;
    const inProgressCount = todos.filter(
      (x) => x.status === "in_progress"
    ).length;

    if (todos.length === 0) {
      return {
        metadata: {
          todos: [],
          title: "No todos",
          pendingCount: 0,
          completedCount: 0,
          inProgressCount: 0,
        },
        output:
          "No todos found for this session. Use todo_write to create your first todo list.",
      };
    }

    return {
      metadata: {
        todos,
        title: `${pendingCount} todos`,
        pendingCount,
        completedCount,
        inProgressCount,
      },
      output: `Current todo list:

Summary:
- ${pendingCount} pending tasks
- ${inProgressCount} in progress  
- ${completedCount} completed tasks

Details:
${JSON.stringify(
  todos.map((t) => ({
    id: t.id,
    content: t.description,
    status: t.status,
    created: new Date(t.created).toISOString(),
    updated: new Date(t.updated).toISOString(),
  })),
  null,
  2
)}`,
    };
  },
});
