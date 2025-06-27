import * as vscode from "vscode";
import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";

const DESCRIPTION = `Get information about the currently active file, cursor position, selected text, and surrounding code context.
- Returns details about the active editor state
- Includes cursor position and any selected text
- Provides surrounding code context around the cursor
- Useful for understanding what the user is currently working on`;

export const CurrentContextTool = Tool.define({
  id: "get_current_context",
  description: DESCRIPTION,
  parameters: z.object({
    contextLines: z
      .number()
      .optional()
      .default(10)
      .describe(
        "Number of lines to include before and after cursor for context"
      ),
  }),
  async execute(params, ctx) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return {
        output: "No active file is currently open in the editor.",
        metadata: { hasActiveFile: false },
      };
    }

    const document = activeEditor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      return {
        output: "Active file is not part of the current workspace.",
        metadata: { hasActiveFile: false },
      };
    }

    const relativePath = path.relative(
      workspaceFolder.uri.fsPath,
      document.uri.fsPath
    );
    const selection = activeEditor.selection;
    const selectedText = selection.isEmpty ? null : document.getText(selection);

    // Get surrounding context around cursor
    const cursorLine = selection.active.line;
    const contextLines = params.contextLines;
    const startLine = Math.max(0, cursorLine - contextLines);
    const endLine = Math.min(document.lineCount - 1, cursorLine + contextLines);

    const surroundingText = document.getText(
      new vscode.Range(
        startLine,
        0,
        endLine,
        document.lineAt(endLine).text.length
      )
    );

    // Get line numbers for the surrounding text
    const lineNumbers: number[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lineNumbers.push(i + 1);
    }

    const numberedLines = surroundingText
      .split("\n")
      .map((line, index) => {
        const lineNum = lineNumbers[index];
        const marker = lineNum === cursorLine + 1 ? " >>> " : "     ";
        return `${lineNum.toString().padStart(4, " ")}${marker}${line}`;
      })
      .join("\n");

    let output = `📍 Current Context:

**File:** ${relativePath}
**Language:** ${document.languageId}
**Cursor Position:** Line ${cursorLine + 1}, Column ${
      selection.active.character + 1
    }`;

    if (selectedText) {
      output += `\n**Selected Text:**\n\`\`\`${document.languageId}\n${selectedText}\n\`\`\``;
    }

    output += `\n\n**Surrounding Context (±${contextLines} lines):**\n\`\`\`${document.languageId}\n${numberedLines}\n\`\`\``;

    // Additional file stats
    const totalLines = document.lineCount;
    const fileSize = Buffer.byteLength(document.getText(), "utf8");
    output += `\n\n**File Stats:** ${totalLines} lines, ${Math.round(
      fileSize / 1024
    )}KB`;

    return {
      output,
      metadata: {
        filePath: relativePath,
        language: document.languageId,
        cursorPosition: {
          line: cursorLine,
          character: selection.active.character,
        },
        selectedText,
        hasActiveFile: true,
        totalLines,
        fileSize,
        surroundingContext: {
          startLine: startLine + 1,
          endLine: endLine + 1,
          content: surroundingText,
        },
      },
    };
  },
});
