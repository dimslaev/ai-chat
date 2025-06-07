interface MarkdownState {
  inCodeBlock: boolean;
  openCodeBlocks: number;
}

export function getMarkdownState(content: string): MarkdownState {
  const lines = content.split("\n");
  let inCodeBlock = false;
  let openCodeBlocks = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        openCodeBlocks++;
      } else {
        inCodeBlock = false;
        openCodeBlocks--;
      }
    }
  }

  return {
    inCodeBlock,
    openCodeBlocks,
  };
}

export function getContinuationContent(
  partialMessage: string,
  newContent: string
): string {
  const state = getMarkdownState(partialMessage);

  // If we're inside a code block and new content starts with ```,
  // we need to close the current block first
  if (state.inCodeBlock && newContent.trim().startsWith("```")) {
    return "\n```\n" + newContent;
  }

  return newContent;
}
