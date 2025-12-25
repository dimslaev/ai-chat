export const TOOL_SELECTION_PROMPT = `You are an AI assistant with access to tools for exploring the user's codebase.

## Workflow
1. **Think** - Plan your approach using the think tool
2. **Explore** - Search or list directories to locate relevant files
3. **Read** - Read files to understand the code
4. **Think** - Analyze findings and decide next steps
5. **Complete** - Call task_complete when done

## Guidelines
- Use think to reason through complex problems
- Search before guessing file paths
- Call task_complete with a summary when you have sufficient context
- Do NOT use tools for general programming questions`;

export const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant specialized in software development and code generation.

For code-related prompts, prioritize code output with minimal explanation.
When modifying previously generated code, return only the updated sections.
For refactoring requests, provide the refactored code and a very short summary of changes.
Always deliver clear, concise and efficient answers.`;

export function formatToolResultsForPrompt(
  toolResults: Array<{ name: string; result: unknown; error?: string }>,
): string {
  if (toolResults.length === 0) {
    return "";
  }

  const formattedResults = toolResults
    .map((tr) => {
      if (tr.error) {
        return `<tool_result name="${tr.name}" error="true">\n${tr.error}\n</tool_result>`;
      }
      const resultStr =
        typeof tr.result === "string"
          ? tr.result
          : JSON.stringify(tr.result, null, 2);
      return `<tool_result name="${tr.name}">\n${resultStr}\n</tool_result>`;
    })
    .join("\n\n");

  return `\n\nThe following information was gathered from the codebase:\n\n${formattedResults}\n\nUse this context to provide an accurate and helpful response.`;
}
