import * as path from "path";

/**
 * Resolve a path relative to workspace root, ensuring absolute path
 */
export function resolveWorkspacePath(
  filePath: string,
  workspaceRoot: string
): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(workspaceRoot, filePath);
}

/**
 * Get relative path from workspace root
 */
export function getRelativePath(
  filePath: string,
  workspaceRoot: string
): string {
  return path.relative(workspaceRoot, filePath);
}

/**
 * Get workspace root relative path, handling both absolute and relative inputs
 */
export function toWorkspaceRelative(
  filePath: string,
  workspaceRoot: string
): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(workspaceRoot, filePath);
  return path.relative(workspaceRoot, absolutePath);
}

/**
 * Resolve relative import path from current file
 */
export function resolveRelativeImport(
  currentFile: string,
  importPath: string,
  workspaceRoot: string
): string | null {
  if (!importPath.startsWith(".")) {
    return null; // Not a relative import
  }

  const currentDir = path.dirname(
    path.isAbsolute(currentFile)
      ? currentFile
      : path.join(workspaceRoot, currentFile)
  );

  const resolved = path.resolve(currentDir, importPath);
  return path.relative(workspaceRoot, resolved);
}

/**
 * Try to resolve a file with common extensions
 */
export function resolveFileWithExtensions(
  basePath: string,
  extensions: string[] = [".ts", ".js", ".tsx", ".jsx", ".json"]
): string[] {
  const candidates = [basePath];

  for (const ext of extensions) {
    candidates.push(basePath + ext);
  }

  // Also try index files in directory
  candidates.push(path.join(basePath, "index.ts"));
  candidates.push(path.join(basePath, "index.js"));

  return candidates;
}

/**
 * Calculate similarity between two file paths (for suggestions)
 */
export function calculatePathSimilarity(path1: string, path2: string): number {
  const name1 = path.basename(path1, path.extname(path1));
  const name2 = path.basename(path2, path.extname(path2));

  if (name1 === name2) return 1.0;

  // Simple similarity based on string distance
  const longer = name1.length > name2.length ? name1 : name2;
  const shorter = name1.length > name2.length ? name2 : name1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
