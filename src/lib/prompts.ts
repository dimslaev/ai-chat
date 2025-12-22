export const TOOL_SELECTION_PROMPT = `You are an AI assistant with access to tools for exploring the user's codebase.

When the user asks a question that requires understanding their code:
1. Use the available tools to gather the necessary context
2. Read files, list directories, or search as needed
3. Only call tools that are directly relevant to the user's question

If the user's question can be answered without accessing the codebase (general programming questions, explanations, etc.), respond directly without using any tools.

Be efficient - only use tools when necessary and avoid redundant calls.`;

export const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant specialized in software development and code generation.

For code-related prompts, prioritize code output with minimal explanation.
When modifying previously generated code, return only the updated sections.
For refactoring requests, provide the refactored code and a very short summary of changes.
Always deliver clear, concise and efficient answers.`;

export function formatToolResultsForPrompt(
  toolResults: Array<{ name: string; result: unknown; error?: string }>
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
