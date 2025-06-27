import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";
import {
  fileExists,
  readFileContent,
  readDirectory,
  getRelativePath,
  resolveRelativeImport,
  resolveFileWithExtensions,
  calculatePathSimilarity,
  parseImportsExports,
  isRelativeImport,
} from "./utils";

const DESCRIPTION = `Find files semantically related to a given file using intelligent analysis.
- Analyzes imports, exports, and dependencies
- Finds test files, implementation files, and type definitions
- Uses naming patterns and directory structure analysis
- Understands common project conventions and frameworks`;

export const SemanticDiscoveryTool = Tool.define({
  id: "discover_related_files",
  description: DESCRIPTION,
  parameters: z.object({
    filePath: z
      .string()
      .describe("The reference file path (relative to workspace root)"),
    relationshipTypes: z
      .array(
        z.enum([
          "tests",
          "implementation",
          "types",
          "imports",
          "exports",
          "similar",
          "config",
        ])
      )
      .optional()
      .default(["tests", "imports", "similar"])
      .describe("Types of relationships to look for"),
    maxResults: z
      .number()
      .optional()
      .default(15)
      .describe("Maximum number of files to return"),
  }),
  async execute(params, ctx) {
    const { filePath, relationshipTypes, maxResults } = params;
    const results: Array<{
      path: string;
      relationship: string;
      confidence: number;
    }> = [];

    const baseName = path.basename(filePath, path.extname(filePath));
    const dirName = path.dirname(filePath);
    const fileExt = path.extname(filePath);

    try {
      // Read the source file to analyze imports/exports
      const sourceContent = await readFileContent(filePath, ctx.workspaceRoot);

      // Find test files
      if (relationshipTypes.includes("tests")) {
        const testFiles = await findTestFiles(
          filePath,
          baseName,
          dirName,
          ctx.workspaceRoot
        );
        results.push(...testFiles);
      }

      // Find implementation files (if current file is a test)
      if (relationshipTypes.includes("implementation")) {
        const implFiles = await findImplementationFiles(
          filePath,
          baseName,
          dirName,
          ctx.workspaceRoot
        );
        results.push(...implFiles);
      }

      // Find type definition files
      if (relationshipTypes.includes("types")) {
        const typeFiles = await findTypeFiles(
          filePath,
          baseName,
          dirName,
          ctx.workspaceRoot
        );
        results.push(...typeFiles);
      }

      // Find imported files
      if (relationshipTypes.includes("imports")) {
        const importedFiles = await findImportedFiles(
          sourceContent,
          filePath,
          ctx.workspaceRoot
        );
        results.push(...importedFiles);
      }

      // Find files that import this file
      if (relationshipTypes.includes("exports")) {
        const dependentFiles = await findDependentFiles(
          filePath,
          ctx.workspaceRoot
        );
        results.push(...dependentFiles);
      }

      // Find similar files
      if (relationshipTypes.includes("similar")) {
        const similarFiles = await findSimilarFiles(
          filePath,
          baseName,
          dirName,
          ctx.workspaceRoot
        );
        results.push(...similarFiles);
      }

      // Find config files
      if (relationshipTypes.includes("config")) {
        const configFiles = await findConfigFiles(
          filePath,
          dirName,
          ctx.workspaceRoot
        );
        results.push(...configFiles);
      }

      // Remove duplicates and sort by confidence
      const uniqueResults = Array.from(
        new Map(results.map((item) => [item.path, item])).values()
      ).sort((a, b) => b.confidence - a.confidence);

      const topResults = uniqueResults.slice(0, maxResults);

      let output = `🔍 Related Files for \`${filePath}\`:\n\n`;

      if (topResults.length === 0) {
        output += "No related files found.";
      } else {
        topResults.forEach((result, index) => {
          const confidence = "★".repeat(Math.ceil(result.confidence * 5));
          output += `${index + 1}. **${result.path}** (${
            result.relationship
          }) ${confidence}\n`;
        });
      }

      return {
        output,
        metadata: {
          totalFound: uniqueResults.length,
          relationships: relationshipTypes,
          relatedFiles: topResults,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        output: `❌ Error analyzing file relationships: ${errorMessage}`,
        metadata: { error: errorMessage },
      };
    }
  },
});

async function findTestFiles(
  filePath: string,
  baseName: string,
  dirName: string,
  workspaceRoot: string
): Promise<Array<{ path: string; relationship: string; confidence: number }>> {
  const results: Array<{
    path: string;
    relationship: string;
    confidence: number;
  }> = [];

  // Common test patterns
  const testPatterns = [
    `${baseName}.test`,
    `${baseName}.spec`,
    `test-${baseName}`,
    `spec-${baseName}`,
    `${baseName}_test`,
    `${baseName}_spec`,
  ];

  const testExtensions = [".ts", ".js", ".tsx", ".jsx"];

  // Look in same directory
  for (const pattern of testPatterns) {
    for (const ext of testExtensions) {
      const testPath = path.join(dirName, `${pattern}${ext}`);
      if (await fileExists(testPath, workspaceRoot)) {
        results.push({
          path: testPath,
          relationship: "test file",
          confidence: 0.9,
        });
      }
    }
  }

  // Look in common test directories
  const testDirs = ["__tests__", "test", "tests", "spec", "specs"];
  for (const testDir of testDirs) {
    const testDirPath = path.join(dirName, testDir);
    for (const pattern of testPatterns) {
      for (const ext of testExtensions) {
        const testPath = path.join(testDirPath, `${pattern}${ext}`);
        if (await fileExists(testPath, workspaceRoot)) {
          results.push({
            path: testPath,
            relationship: "test file",
            confidence: 0.8,
          });
        }
      }
    }
  }

  return results;
}

async function findImplementationFiles(
  filePath: string,
  baseName: string,
  dirName: string,
  workspaceRoot: string
): Promise<Array<{ path: string; relationship: string; confidence: number }>> {
  const results: Array<{
    path: string;
    relationship: string;
    confidence: number;
  }> = [];

  // If this is a test file, find the implementation
  const isTestFile =
    /\.(test|spec)\./.test(filePath) ||
    filePath.includes("__tests__") ||
    filePath.includes("/test/") ||
    filePath.includes("/tests/");

  if (!isTestFile) return results;

  // Remove test suffixes
  let implBaseName = baseName
    .replace(/\.test$/, "")
    .replace(/\.spec$/, "")
    .replace(/^test-/, "")
    .replace(/^spec-/, "")
    .replace(/_test$/, "")
    .replace(/_spec$/, "");

  const implExtensions = [".ts", ".js", ".tsx", ".jsx"];

  // Look in parent directory (common pattern)
  const parentDir = path.dirname(dirName);
  for (const ext of implExtensions) {
    const implPath = path.join(parentDir, `${implBaseName}${ext}`);
    if (await fileExists(implPath, workspaceRoot)) {
      results.push({
        path: implPath,
        relationship: "implementation file",
        confidence: 0.9,
      });
    }
  }

  // Look in same directory
  for (const ext of implExtensions) {
    const implPath = path.join(dirName, `${implBaseName}${ext}`);
    if (await fileExists(implPath, workspaceRoot)) {
      results.push({
        path: implPath,
        relationship: "implementation file",
        confidence: 0.8,
      });
    }
  }

  return results;
}

async function findTypeFiles(
  filePath: string,
  baseName: string,
  dirName: string,
  workspaceRoot: string
): Promise<Array<{ path: string; relationship: string; confidence: number }>> {
  const results: Array<{
    path: string;
    relationship: string;
    confidence: number;
  }> = [];

  const typePatterns = [
    `${baseName}.types`,
    `${baseName}.d`,
    `${baseName}.interface`,
    `types/${baseName}`,
    `@types/${baseName}`,
  ];

  const typeExtensions = [".ts", ".d.ts"];

  for (const pattern of typePatterns) {
    for (const ext of typeExtensions) {
      const typePath = path.join(dirName, `${pattern}${ext}`);
      if (await fileExists(typePath, workspaceRoot)) {
        results.push({
          path: typePath,
          relationship: "type definitions",
          confidence: 0.8,
        });
      }
    }
  }

  return results;
}

async function findImportedFiles(
  sourceContent: string,
  filePath: string,
  workspaceRoot: string
): Promise<Array<{ path: string; relationship: string; confidence: number }>> {
  const results: Array<{
    path: string;
    relationship: string;
    confidence: number;
  }> = [];

  // Use shared import parsing utility
  const { imports } = parseImportsExports(sourceContent);

  for (const importInfo of imports) {
    // Skip package imports, only process relative imports
    if (!isRelativeImport(importInfo.source)) continue;

    // Use shared relative import resolution
    const resolvedBasePath = resolveRelativeImport(
      filePath,
      importInfo.source,
      workspaceRoot
    );

    if (!resolvedBasePath) continue;

    // Try different extensions using shared utility
    const candidates = resolveFileWithExtensions(
      path.join(workspaceRoot, resolvedBasePath)
    );

    for (const candidate of candidates) {
      const relativePath = getRelativePath(candidate, workspaceRoot);

      if (await fileExists(relativePath, workspaceRoot)) {
        results.push({
          path: relativePath,
          relationship: "imported file",
          confidence: 0.7,
        });
        break;
      }
    }
  }

  return results;
}

async function findDependentFiles(
  filePath: string,
  workspaceRoot: string
): Promise<Array<{ path: string; relationship: string; confidence: number }>> {
  const results: Array<{
    path: string;
    relationship: string;
    confidence: number;
  }> = [];

  // This would require searching through all files, which could be expensive
  // For now, return empty array - could be implemented with workspace-wide search
  return results;
}

async function findSimilarFiles(
  filePath: string,
  baseName: string,
  dirName: string,
  workspaceRoot: string
): Promise<Array<{ path: string; relationship: string; confidence: number }>> {
  const results: Array<{
    path: string;
    relationship: string;
    confidence: number;
  }> = [];

  // Find files with similar names in the same directory
  try {
    const dirEntries = await readDirectory(dirName, workspaceRoot);

    for (const [name, type] of dirEntries) {
      if (type === 1) {
        // vscode.FileType.File
        const nameWithoutExt = path.basename(name, path.extname(name));
        const similarity = calculatePathSimilarity(baseName, nameWithoutExt);

        if (similarity > 0.5 && name !== path.basename(filePath)) {
          results.push({
            path: path.join(dirName, name),
            relationship: "similar file",
            confidence: similarity * 0.6,
          });
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }

  return results;
}

async function findConfigFiles(
  filePath: string,
  dirName: string,
  workspaceRoot: string
): Promise<Array<{ path: string; relationship: string; confidence: number }>> {
  const results: Array<{
    path: string;
    relationship: string;
    confidence: number;
  }> = [];

  const configFiles = [
    "package.json",
    "tsconfig.json",
    ".eslintrc.js",
    ".eslintrc.json",
    "jest.config.js",
    "webpack.config.js",
    ".babelrc",
    "tailwind.config.js",
  ];

  // Look in current directory and parent directories
  let currentDir = dirName;
  for (let i = 0; i < 5; i++) {
    for (const configFile of configFiles) {
      const configPath = path.join(currentDir, configFile);
      if (await fileExists(configPath, workspaceRoot)) {
        results.push({
          path: configPath,
          relationship: "config file",
          confidence: 0.5,
        });
      }
    }

    // Move to parent directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  return results;
}

// Removed: fileExists, calculateSimilarity, and levenshteinDistance
// These are now available from ./utils
