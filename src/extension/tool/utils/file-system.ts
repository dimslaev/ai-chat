import * as vscode from "vscode";
import * as path from "path";

/**
 * Check if a file exists at the given path
 */
export async function fileExists(
  filePath: string,
  workspaceRoot: string
): Promise<boolean> {
  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(workspaceRoot, filePath);
    const uri = vscode.Uri.file(fullPath);
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file contents as string
 */
export async function readFileContent(
  filePath: string,
  workspaceRoot: string
): Promise<string> {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
  const uri = vscode.Uri.file(fullPath);
  const fileData = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(fileData).toString("utf8");
}

/**
 * Write content to file
 */
export async function writeFileContent(
  filePath: string,
  content: string,
  workspaceRoot: string
): Promise<void> {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
  const uri = vscode.Uri.file(fullPath);
  const encoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
}

/**
 * Get file stats
 */
export async function getFileStat(
  filePath: string,
  workspaceRoot: string
): Promise<vscode.FileStat> {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
  const uri = vscode.Uri.file(fullPath);
  return await vscode.workspace.fs.stat(uri);
}

/**
 * Read directory contents
 */
export async function readDirectory(
  dirPath: string,
  workspaceRoot: string
): Promise<[string, vscode.FileType][]> {
  const fullPath = path.isAbsolute(dirPath)
    ? dirPath
    : path.join(workspaceRoot, dirPath);
  const uri = vscode.Uri.file(fullPath);
  return await vscode.workspace.fs.readDirectory(uri);
}

/**
 * Find files matching a pattern (using VSCode's search)
 */
export async function findFiles(
  pattern: string,
  workspaceRoot: string,
  maxResults = 50
): Promise<string[]> {
  const glob = new vscode.RelativePattern(workspaceRoot, pattern);
  const files = await vscode.workspace.findFiles(glob, null, maxResults);
  return files.map((uri) => path.relative(workspaceRoot, uri.fsPath));
}
