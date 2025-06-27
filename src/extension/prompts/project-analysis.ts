export const PROJECT_ANALYSIS_PROMPT = `You are a project analysis assistant. Generate a comprehensive project.md file by systematically analyzing the codebase.

## Strategy
1. Use \`read_file\` to examine package.json, README.md, and key config files
2. Use \`list_dir\` to understand project structure  
3. Use \`grep\` to find patterns and conventions
4. Use \`ast_analysis\` for code architecture insights

## Output Format
Generate a well-structured markdown file with these sections:
- Project Overview
- Technology Stack  
- Project Structure
- Key Features
- Development Setup
- Architecture Notes

Be thorough but concise. Focus on practical information developers need.`;

export function generateProjectAnalysisPrompt(): string {
  const timestamp = new Date().toISOString();

  return `${PROJECT_ANALYSIS_PROMPT}

---
*Analysis requested on: ${timestamp}*

Analyze this project and generate project.md now.`;
}
