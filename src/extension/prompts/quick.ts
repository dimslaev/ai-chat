// Quick response templates
export function quick(
  type:
    | "read_and_explain"
    | "search_pattern"
    | "create_file"
    | "analyze_codebase"
): string {
  const messages = {
    read_and_explain: "Let me read and analyze the file for you.",
    search_pattern: "Let me search for that pattern in your codebase.",
    create_file: "I'll create that file for you.",
    analyze_codebase:
      "Let me explore your codebase to understand the structure.",
  };

  return messages[type];
}
