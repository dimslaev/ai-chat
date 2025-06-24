// Error handling prompts
export function error(
  type: "file_not_found" | "tool_error" | "no_workspace",
  context?: string
): string {
  const messages = {
    file_not_found:
      "The file wasn't found, but I can help you create it or find similar files.",
    tool_error:
      "I encountered an issue with the tool, but I can still help you with general guidance.",
    no_workspace:
      "No workspace is open. Please open a folder or workspace to use file tools.",
  };

  let prompt = `\n⚠️ ${messages[type]}`;
  if (context) {
    prompt += `\n\nContext: ${context}`;
  }
  return prompt;
}
