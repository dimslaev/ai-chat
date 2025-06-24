export interface ContextPromptOptions {
  currentFile?: {
    path: string;
    content: string;
    language?: string;
    cursorPosition?: { line: number; character: number };
    selection?: string;
  };
  relatedFiles?: Array<{
    path: string;
    content?: string;
    relationship: string;
  }>;
  projectStructure?: string;
  patterns?: string[];
  intent?: string;
}

// Context-enhanced prompt with gathered information
export function contextEnhanced(options: ContextPromptOptions): string {
  let contextPrompt = "\n\n--- CONTEXT INFORMATION ---\n";

  if (options.currentFile) {
    contextPrompt += `\nCurrent File: ${options.currentFile.path}`;
    if (options.currentFile.language) {
      contextPrompt += ` (${options.currentFile.language})`;
    }
    if (options.currentFile.cursorPosition) {
      contextPrompt += `\nCursor Position: Line ${options.currentFile.cursorPosition.line}, Column ${options.currentFile.cursorPosition.character}`;
    }
    if (options.currentFile.selection) {
      contextPrompt += `\nSelected Text: ${options.currentFile.selection}`;
    }
    contextPrompt += `\n\`\`\`${options.currentFile.language || ""}\n${
      options.currentFile.content
    }\n\`\`\``;
  }

  if (options.relatedFiles && options.relatedFiles.length > 0) {
    contextPrompt += "\n\nRelated Files:";
    options.relatedFiles.forEach((file) => {
      contextPrompt += `\n- ${file.path} (${file.relationship})`;
    });
  }

  if (options.projectStructure) {
    contextPrompt += `\n\nProject Structure:\n${options.projectStructure}`;
  }

  if (options.patterns && options.patterns.length > 0) {
    contextPrompt += `\n\nDetected Patterns:\n${options.patterns
      .map((p) => `- ${p}`)
      .join("\n")}`;
  }

  if (options.intent) {
    contextPrompt += `\n\nInferred Intent: ${options.intent}`;
  }

  contextPrompt += "\n--- END CONTEXT ---\n";

  return contextPrompt;
}
