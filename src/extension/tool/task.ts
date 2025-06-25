import { z } from "zod";
import { Tool } from "./tool";

const DESCRIPTION = `Plan and execute a focused sub-task for complex operations.

This tool helps break down complex work into manageable steps and provides 
structured planning for multi-step operations.

When to use:
- Complex multi-step operations that need planning
- Research tasks requiring multiple tool invocations  
- When you need to organize and track sub-tasks
- File searches across large codebases
- Code analysis and refactoring planning

When NOT to use:
- Simple file operations (use read_file, write_file directly)
- Single tool invocations
- Straightforward tasks that can be completed in 1-2 steps

Usage notes:
- Provide a clear, specific task description
- The tool will help you plan and structure the work
- Use with todo_write to track the planned steps
- Follow the recommended approach for systematic execution`;

export const TaskTool = Tool.define({
  id: "task",
  description: DESCRIPTION,
  parameters: z.object({
    description: z
      .string()
      .describe("A short (3-5 words) description of the task"),
    prompt: z.string().describe("The detailed task to plan and structure"),
  }),
  async execute(params, ctx) {
    const taskId = `task-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Analyze the task to provide specific guidance
    const isCodeTask = /code|refactor|function|class|implement|debug|fix/.test(
      params.prompt.toLowerCase()
    );
    const isSearchTask = /find|search|locate|discover|identify/.test(
      params.prompt.toLowerCase()
    );
    const isAnalysisTask = /analyze|understand|review|examine|explore/.test(
      params.prompt.toLowerCase()
    );

    let recommendedTools = [];
    let specificSteps = [];

    if (isCodeTask) {
      recommendedTools.push("analyze-ast", "read_file", "grep", "write_file");
      specificSteps = [
        "Use analyze-ast to understand code structure and dependencies",
        "Use read_file to examine relevant source files",
        "Use grep to find related patterns across the codebase",
        "Plan changes and use write_file for implementation",
      ];
    } else if (isSearchTask) {
      recommendedTools.push("grep", "list_dir", "read_file");
      specificSteps = [
        "Use grep to search for patterns across files",
        "Use list_dir to explore directory structure",
        "Use read_file to examine candidate files",
        "Document findings and patterns discovered",
      ];
    } else if (isAnalysisTask) {
      recommendedTools.push("analyze-ast", "read_file", "grep", "list_dir");
      specificSteps = [
        "Use list_dir to understand project structure",
        "Use analyze-ast to extract code information",
        "Use read_file to examine key files",
        "Use grep to find related code patterns",
      ];
    } else {
      recommendedTools.push("read_file", "grep", "list_dir");
      specificSteps = [
        "Break down the task into smaller components",
        "Use appropriate tools to gather information",
        "Document findings and plan next steps",
        "Execute planned actions systematically",
      ];
    }

    const planningOutput = `# Task: ${params.description}

## Detailed Requirements
${params.prompt}

## Recommended Approach
${specificSteps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Suggested Tools
- **Primary tools**: ${recommendedTools.slice(0, 2).join(", ")}
- **Supporting tools**: ${recommendedTools.slice(2).join(", ")}

## Task Planning Template
Create a todo list with these phases:

**Research Phase:**
- [ ] Gather context and understand current state
- [ ] Identify relevant files and code patterns
- [ ] Document findings and constraints

**Planning Phase:**
- [ ] Break down the work into specific steps
- [ ] Identify dependencies and prerequisites  
- [ ] Plan the implementation approach

**Implementation Phase:**
- [ ] Execute planned changes systematically
- [ ] Test and verify each step
- [ ] Document any issues encountered

**Verification Phase:**
- [ ] Review completed work for correctness
- [ ] Test functionality if applicable
- [ ] Document results and lessons learned

## Next Steps
1. Use **todo_write** to create concrete tasks based on this plan
2. Start with the Research Phase using ${recommendedTools[0]}
3. Update todo status as you progress through each phase

---
*Task planned: ${timestamp}*
*Task ID: ${taskId}*`;

    return {
      output: planningOutput,
      metadata: {
        title: params.description,
        taskId,
        status: "planned",
        type: "planning_assistant",
        recommendedTools,
        timestamp,
        taskType: isCodeTask
          ? "code"
          : isSearchTask
          ? "search"
          : isAnalysisTask
          ? "analysis"
          : "general",
      },
    };
  },
});
