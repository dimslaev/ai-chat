// Category-specific prompts
// @TODO - this is currently not used anywhere, it should be llm-inferred
export function category(category: string): string {
  const prompts: Record<string, string> = {
    code_generation: `

Focus: Creating new, high-quality code
- Follow established patterns found in the existing codebase
- Include proper error handling and edge case considerations
- Use meaningful variable names and add comments for complex logic
- Provide complete, runnable solutions that integrate well`,

    debugging: `

Focus: Identifying and fixing software issues
- Systematically analyze code to identify root causes
- Search for similar patterns that might reveal the issue
- Provide clear explanations of what went wrong and why
- Include preventive measures to avoid similar issues`,

    refactoring: `

Focus: Improving existing code quality
- Preserve existing functionality while improving structure
- Enhance readability, maintainability, and performance
- Apply design patterns where appropriate
- Ensure all references are updated consistently`,

    testing: `

Focus: Creating comprehensive test suites
- Write thorough unit, integration, and end-to-end tests
- Follow existing testing patterns found in the codebase
- Cover edge cases, error conditions, and boundary values
- Ensure tests are maintainable, readable, and fast`,

    documentation: `

Focus: Creating clear, helpful documentation
- Write clear, accurate documentation with practical examples
- Include code examples found in the actual codebase
- Keep documentation synchronized with actual implementation
- Include setup instructions and troubleshooting guides`,

    analysis: `

Focus: Understanding and explaining codebases
- Thoroughly analyze code structure and architecture
- Identify patterns, dependencies, and potential issues
- Explain complex concepts in clear, accessible terms
- Base analysis on actual code examination, not assumptions`,
  };

  return prompts[category] || "";
}
