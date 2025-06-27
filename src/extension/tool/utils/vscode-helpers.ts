import * as vscode from "vscode";
import * as path from "path";

/**
 * Create a VSCode URI from a file path
 */
export function createFileUri(
  filePath: string,
  workspaceRoot: string
): vscode.Uri {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(workspaceRoot, filePath);
  return vscode.Uri.file(absolutePath);
}

/**
 * Open a document and ensure language services are active
 */
export async function openDocument(
  filePath: string,
  workspaceRoot: string
): Promise<vscode.TextDocument> {
  const uri = createFileUri(filePath, workspaceRoot);
  return await vscode.workspace.openTextDocument(uri);
}

/**
 * Get document symbols from VSCode language services
 */
export async function getDocumentSymbols(
  uri: vscode.Uri
): Promise<vscode.DocumentSymbol[]> {
  try {
    const symbols = await vscode.commands.executeCommand<
      vscode.DocumentSymbol[]
    >("vscode.executeDocumentSymbolProvider", uri);
    return symbols || [];
  } catch (error) {
    console.warn("Failed to get document symbols:", error);
    return [];
  }
}

/**
 * Get references to a symbol at a specific position
 */
export async function getReferences(
  uri: vscode.Uri,
  position: vscode.Position,
  includeDeclaration = false
): Promise<vscode.Location[]> {
  try {
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeReferenceProvider",
      uri,
      position,
      includeDeclaration
    );
    return references || [];
  } catch (error) {
    console.warn("Failed to get references:", error);
    return [];
  }
}

/**
 * Get definition of a symbol at a specific position
 */
export async function getDefinition(
  uri: vscode.Uri,
  position: vscode.Position
): Promise<vscode.LocationLink[] | vscode.Location[]> {
  try {
    const definition = await vscode.commands.executeCommand<
      vscode.LocationLink[] | vscode.Location[]
    >("vscode.executeDefinitionProvider", uri, position);
    return definition || [];
  } catch (error) {
    console.warn("Failed to get definition:", error);
    return [];
  }
}

/**
 * Get the workspace folder for a given URI
 */
export function getWorkspaceFolder(
  uri: vscode.Uri
): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.getWorkspaceFolder(uri);
}

/**
 * Get current active editor context
 */
export function getCurrentEditorContext(): {
  editor: vscode.TextEditor | undefined;
  document: vscode.TextDocument | undefined;
  selection: vscode.Selection | undefined;
  position: vscode.Position | undefined;
} {
  const editor = vscode.window.activeTextEditor;
  return {
    editor,
    document: editor?.document,
    selection: editor?.selection,
    position: editor?.selection?.active,
  };
}

/**
 * Check if a file is part of the current workspace
 */
export function isInWorkspace(uri: vscode.Uri): boolean {
  return !!vscode.workspace.getWorkspaceFolder(uri);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
