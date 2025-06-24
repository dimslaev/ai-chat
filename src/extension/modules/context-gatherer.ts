import * as vscode from "vscode";
import * as path from "path";

export interface GatheredContext {
  currentFile?: {
    path: string;
    content: string;
    language: string;
    cursorPosition?: { line: number; character: number };
    selection?: string;
  };
  relatedFiles: Array<{
    path: string;
    relationship: string;
  }>;
  projectStructure?: string;
  patterns: string[];
  intent?: string;
}

export namespace ContextGatherer {
  /**
   * Gather comprehensive context for the current state
   */
  export async function gather(): Promise<GatheredContext> {
    const context: GatheredContext = {
      relatedFiles: [],
      patterns: [],
    };

    // Get current file context
    context.currentFile = getCurrentFileContext();

    // Find related files based on file name patterns (only existing files)
    if (context.currentFile) {
      context.relatedFiles = await findRelatedFilePatterns(
        context.currentFile.path
      );
    }

    // Get project structure overview
    context.projectStructure = getProjectStructure();

    // Detect common patterns
    context.patterns = detectCommonPatterns(context.currentFile);

    // Infer user intent
    context.intent = inferIntent(context);

    return context;
  }

  /**
   * Get a summary of the gathered context
   */
  export function formatSummary(context: GatheredContext): string {
    let summary = "📋 Context gathered:\n";

    if (context.currentFile) {
      summary += `• Current file: ${context.currentFile.path} (${context.currentFile.language})\n`;
    }

    if (context.relatedFiles.length > 0) {
      summary += `• Found ${context.relatedFiles.length} potential related files\n`;
    }

    if (context.patterns.length > 0) {
      summary += `• Detected patterns: ${context.patterns.join(", ")}\n`;
    }

    if (context.intent) {
      summary += `• Inferred intent: ${context.intent}\n`;
    }

    return summary;
  }

  /**
   * Get current file information from VS Code
   */
  function getCurrentFileContext() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return undefined;
    }

    const document = activeEditor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      return undefined;
    }

    const relativePath = path.relative(
      workspaceFolder.uri.fsPath,
      document.uri.fsPath
    );
    const content = document.getText();
    const language = document.languageId;

    // Get cursor position
    const position = activeEditor.selection.active;
    const cursorPosition = {
      line: position.line,
      character: position.character,
    };

    // Get selected text if any
    const selection = activeEditor.selection.isEmpty
      ? undefined
      : document.getText(activeEditor.selection);

    return {
      path: relativePath,
      content,
      language,
      cursorPosition,
      selection,
    };
  }

  /**
   * Find files related to the current file using simple pattern matching
   */
  async function findRelatedFilePatterns(
    currentFilePath: string
  ): Promise<Array<{ path: string; relationship: string }>> {
    const relatedFiles: Array<{ path: string; relationship: string }> = [];
    const baseName = path.basename(
      currentFilePath,
      path.extname(currentFilePath)
    );
    const dirName = path.dirname(currentFilePath);

    // Get workspace folder for absolute path resolution
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return relatedFiles;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Common related file patterns
    const patterns = [
      { suffix: ".test", relationship: "test file" },
      { suffix: ".spec", relationship: "test file" },
      { suffix: ".stories", relationship: "storybook file" },
      { suffix: ".types", relationship: "type definitions" },
      { suffix: ".d", relationship: "type declarations" },
      { prefix: "test-", relationship: "test file" },
      { prefix: "spec-", relationship: "test file" },
    ];

    // Generate potential related file paths
    const potentialFiles: Array<{ path: string; relationship: string }> = [];

    patterns.forEach((pattern) => {
      if (pattern.suffix) {
        potentialFiles.push({
          path: path.join(dirName, `${baseName}${pattern.suffix}.ts`),
          relationship: pattern.relationship,
        });
        potentialFiles.push({
          path: path.join(dirName, `${baseName}${pattern.suffix}.js`),
          relationship: pattern.relationship,
        });
      }
      if (pattern.prefix) {
        potentialFiles.push({
          path: path.join(dirName, `${pattern.prefix}${baseName}.ts`),
          relationship: pattern.relationship,
        });
        potentialFiles.push({
          path: path.join(dirName, `${pattern.prefix}${baseName}.js`),
          relationship: pattern.relationship,
        });
      }
    });

    // Check which files actually exist
    for (const file of potentialFiles) {
      try {
        const absolutePath = path.join(workspaceRoot, file.path);
        const uri = vscode.Uri.file(absolutePath);
        await vscode.workspace.fs.stat(uri);
        // If we get here, the file exists
        relatedFiles.push(file);
      } catch (error) {
        // File doesn't exist, skip it
      }
    }

    return relatedFiles;
  }

  /**
   * Get a simple overview of project structure
   */
  function getProjectStructure(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    return `Workspace: ${workspaceFolders[0].name}\nRoot: ${workspaceFolders[0].uri.fsPath}`;
  }

  /**
   * Detect common patterns based on file content and name
   */
  function detectCommonPatterns(
    currentFile?: GatheredContext["currentFile"]
  ): string[] {
    const patterns: string[] = [];

    if (!currentFile) {
      return patterns;
    }

    const { path: filePath, content } = currentFile;

    // File type patterns
    if (filePath.includes(".test.") || filePath.includes(".spec.")) {
      patterns.push("Test file");
    }

    if (filePath.includes(".component.") || filePath.includes(".tsx")) {
      patterns.push("React component");
    }

    if (filePath.includes(".service.") || filePath.includes("Service")) {
      patterns.push("Service class");
    }

    // Content patterns
    if (content.includes("import React") || content.includes('from "react"')) {
      patterns.push("React application");
    }

    if (
      content.includes("describe(") ||
      content.includes("it(") ||
      content.includes("test(")
    ) {
      patterns.push("Test suite");
    }

    if (content.includes("export class") || content.includes("class ")) {
      patterns.push("Class definition");
    }

    if (
      content.includes("export function") ||
      (content.includes("const ") && content.includes("= ("))
    ) {
      patterns.push("Function definition");
    }

    if (
      content.includes("TODO") ||
      content.includes("FIXME") ||
      content.includes("XXX")
    ) {
      patterns.push("Contains TODOs");
    }

    return patterns;
  }

  /**
   * Infer user intent based on context
   */
  function inferIntent(context: GatheredContext): string | undefined {
    if (!context.currentFile) {
      return "Exploring project structure";
    }

    const {
      path: filePath,
      selection,
      cursorPosition,
      content,
    } = context.currentFile;

    // File type analysis
    if (filePath.includes(".test.") || filePath.includes(".spec.")) {
      return "Working with tests";
    }

    if (filePath.includes("README") || filePath.includes(".md")) {
      return "Working with documentation";
    }

    if (selection) {
      return "Analyzing selected code";
    }

    if (cursorPosition && content) {
      // Check the current line
      const lines = content.split("\n");
      const currentLine = lines[cursorPosition.line] || "";

      if (
        currentLine.includes("function") ||
        currentLine.includes("const") ||
        currentLine.includes("class")
      ) {
        return "Defining new functionality";
      }

      if (currentLine.includes("import") || currentLine.includes("require")) {
        return "Managing dependencies";
      }

      if (currentLine.includes("TODO") || currentLine.includes("FIXME")) {
        return "Addressing code issues";
      }
    }

    // Default based on file type
    const fileExtension = path.extname(filePath);
    if ([".js", ".ts", ".jsx", ".tsx"].includes(fileExtension)) {
      return "Developing JavaScript/TypeScript code";
    }

    return "Code development";
  }
}
