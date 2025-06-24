export interface FileContextOptions {
  fileName: string;
  content: string;
  language?: string;
  lineNumbers?: boolean;
}

// File content display
export function fileContext(options: FileContextOptions): string {
  const { fileName, content, language, lineNumbers } = options;

  let prompt = `\nFile: ${fileName}`;
  if (language) {
    prompt += ` (${language})`;
  }
  prompt += "\n";

  if (lineNumbers) {
    const lines = content.split("\n");
    const lineNumberWidth = lines.length.toString().length;
    const numberedContent = lines
      .map(
        (line, index) =>
          `${(index + 1).toString().padStart(lineNumberWidth)} | ${line}`
      )
      .join("\n");
    prompt += `\`\`\`${language || ""}\n${numberedContent}\n\`\`\``;
  } else {
    prompt += `\`\`\`${language || ""}\n${content}\n\`\`\``;
  }

  return prompt;
}
