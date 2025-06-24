import { z } from "zod";
import { Tool } from "./tool";
import * as vscode from "vscode";
import * as path from "path";

export const FindRelatedTool = Tool.define({
  id: "find_related",
  description:
    "Find files related to the current file through imports, tests, types, etc.",
  parameters: z.object({
    filePath: z.string().describe("The file path to find related files for"),
    relationTypes: z
      .array(z.enum(["imports", "tests", "types", "similar"]))
      .optional()
      .describe("Types of relationships to find"),
    maxResults: z
      .number()
      .optional()
      .describe("Maximum number of results to return"),
  }),
  async execute(params, ctx) {
    const workspaceRoot = ctx.workspaceRoot;
    const targetPath = path.isAbsolute(params.filePath)
      ? params.filePath
      : path.join(workspaceRoot, params.filePath);

    const relationTypes = params.relationTypes || [
      "imports",
      "tests",
      "types",
      "similar",
    ];
    const maxResults = params.maxResults || 20;

    try {
      const relatedFiles: Array<{
        path: string;
        relationship: string;
        confidence: number;
        description: string;
      }> = [];

      // Find imports
      if (relationTypes.includes("imports")) {
        const imports = await findImportedFiles(targetPath, workspaceRoot);
        relatedFiles.push(
          ...imports.map((filePath) => ({
            path: path.relative(workspaceRoot, filePath),
            relationship: "import",
            confidence: 0.9,
            description: "File imported by current file",
          }))
        );
      }

      // Find test files
      if (relationTypes.includes("tests")) {
        const tests = await findTestFiles(targetPath, workspaceRoot);
        relatedFiles.push(
          ...tests.map((filePath) => ({
            path: path.relative(workspaceRoot, filePath),
            relationship: "test",
            confidence: 0.8,
            description: "Test file for current file",
          }))
        );
      }

      // Find type files
      if (relationTypes.includes("types")) {
        const types = await findTypeFiles(targetPath, workspaceRoot);
        relatedFiles.push(
          ...types.map((filePath) => ({
            path: path.relative(workspaceRoot, filePath),
            relationship: "type",
            confidence: 0.7,
            description: "Type definition file",
          }))
        );
      }

      // Find similar files
      if (relationTypes.includes("similar")) {
        const similar = await findSimilarFiles(targetPath, workspaceRoot);
        relatedFiles.push(
          ...similar.map(({ filePath, similarity }) => ({
            path: path.relative(workspaceRoot, filePath),
            relationship: "similar",
            confidence: similarity,
            description: "File with similar name or location",
          }))
        );
      }

      // Sort by confidence and limit results
      const sortedFiles = relatedFiles
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxResults);

      const output = formatRelatedFiles(
        sortedFiles,
        path.relative(workspaceRoot, targetPath)
      );

      return {
        metadata: {
          sourceFile: path.relative(workspaceRoot, targetPath),
          relatedCount: sortedFiles.length,
          relationTypes: relationTypes,
          title: `Related to ${path.basename(targetPath)}`,
        },
        output,
      };
    } catch (error) {
      throw new Error(
        `Failed to find related files: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

async function findImportedFiles(
  filePath: string,
  workspaceRoot: string
): Promise<string[]> {
  try {
    const content = await readFileContent(filePath);
    if (!content) return [];

    const imports: string[] = [];
    const importRegexes = [
      /import.*from ['"](.+?)['"];?/g, // ES6 imports
      /require\(['"](.+?)['"]\)/g, // CommonJS requires
      /import\(['"](.+?)['"]\)/g, // Dynamic imports
    ];

    for (const regex of importRegexes) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          const resolvedPath = await resolveImportPath(
            filePath,
            importPath,
            workspaceRoot
          );
          if (resolvedPath) {
            imports.push(resolvedPath);
          }
        }
      }
    }

    return [...new Set(imports)]; // Remove duplicates
  } catch {
    return [];
  }
}

async function findTestFiles(
  filePath: string,
  workspaceRoot: string
): Promise<string[]> {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath);

  const testPatterns = [
    // Same directory
    path.join(dir, `${baseName}.test${ext}`),
    path.join(dir, `${baseName}.spec${ext}`),
    path.join(dir, `${baseName}.test.ts`),
    path.join(dir, `${baseName}.spec.ts`),
    path.join(dir, `${baseName}.test.js`),
    path.join(dir, `${baseName}.spec.js`),

    // Tests directory
    path.join(dir, "__tests__", `${baseName}${ext}`),
    path.join(dir, "__tests__", `${baseName}.test${ext}`),
    path.join(dir, "tests", `${baseName}${ext}`),
    path.join(dir, "tests", `${baseName}.test${ext}`),

    // Root tests directory
    path.join(
      workspaceRoot,
      "tests",
      path.relative(workspaceRoot, dir),
      `${baseName}${ext}`
    ),
    path.join(
      workspaceRoot,
      "__tests__",
      path.relative(workspaceRoot, dir),
      `${baseName}${ext}`
    ),
  ];

  const existingFiles: string[] = [];
  for (const testPath of testPatterns) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(testPath));
      existingFiles.push(testPath);
    } catch {
      // File doesn't exist
    }
  }

  return existingFiles;
}

async function findTypeFiles(
  filePath: string,
  workspaceRoot: string
): Promise<string[]> {
  const typeFiles: string[] = [];

  // Common type file locations
  const typeLocations = [
    "src/types.ts",
    "src/types/index.ts",
    "types/index.ts",
    "types.ts",
    "@types",
    "src/@types",
  ];

  for (const location of typeLocations) {
    const typePath = path.join(workspaceRoot, location);
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(typePath));
      if (stat.type === vscode.FileType.File) {
        typeFiles.push(typePath);
      } else if (stat.type === vscode.FileType.Directory) {
        // If it's a directory, look for relevant type files inside
        const typeDir = await vscode.workspace.fs.readDirectory(
          vscode.Uri.file(typePath)
        );
        for (const [name, type] of typeDir) {
          if (type === vscode.FileType.File && name.endsWith(".ts")) {
            typeFiles.push(path.join(typePath, name));
          }
        }
      }
    } catch {
      // Path doesn't exist
    }
  }

  return typeFiles;
}

async function findSimilarFiles(
  filePath: string,
  workspaceRoot: string
): Promise<Array<{ filePath: string; similarity: number }>> {
  const baseName = path.basename(filePath, path.extname(filePath));
  const dir = path.dirname(filePath);

  const similarFiles: Array<{ filePath: string; similarity: number }> = [];

  try {
    // Search in the same directory
    const dirFiles = await vscode.workspace.fs.readDirectory(
      vscode.Uri.file(dir)
    );
    for (const [name, type] of dirFiles) {
      if (type === vscode.FileType.File && name !== path.basename(filePath)) {
        const similarity = calculateNameSimilarity(
          baseName,
          path.basename(name, path.extname(name))
        );
        if (similarity > 0.3) {
          similarFiles.push({
            filePath: path.join(dir, name),
            similarity,
          });
        }
      }
    }

    // Search in related directories (components, utils, etc.)
    const relatedDirs = ["components", "utils", "helpers", "lib", "src"];
    for (const relatedDir of relatedDirs) {
      const searchPath = path.join(workspaceRoot, relatedDir);
      try {
        const files = await findFilesRecursively(searchPath, baseName);
        similarFiles.push(...files);
      } catch {
        // Directory doesn't exist
      }
    }
  } catch {
    // Error reading directory
  }

  return similarFiles.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
}

async function findFilesRecursively(
  dirPath: string,
  searchTerm: string
): Promise<Array<{ filePath: string; similarity: number }>> {
  const files: Array<{ filePath: string; similarity: number }> = [];

  try {
    const entries = await vscode.workspace.fs.readDirectory(
      vscode.Uri.file(dirPath)
    );

    for (const [name, type] of entries) {
      const fullPath = path.join(dirPath, name);

      if (type === vscode.FileType.File) {
        const similarity = calculateNameSimilarity(
          searchTerm,
          path.basename(name, path.extname(name))
        );
        if (similarity > 0.3) {
          files.push({ filePath: fullPath, similarity });
        }
      } else if (
        type === vscode.FileType.Directory &&
        !name.startsWith(".") &&
        name !== "node_modules"
      ) {
        const subFiles = await findFilesRecursively(fullPath, searchTerm);
        files.push(...subFiles);
      }
    }
  } catch {
    // Error reading directory
  }

  return files;
}

async function resolveImportPath(
  currentFile: string,
  importPath: string,
  workspaceRoot: string
): Promise<string | null> {
  const currentDir = path.dirname(currentFile);
  let resolved = path.resolve(currentDir, importPath);

  // Try common extensions
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"];
  const indexFiles = ["/index.ts", "/index.tsx", "/index.js", "/index.jsx"];

  // Try exact path first
  for (const ext of extensions) {
    const withExt = resolved + ext;
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(withExt));
      return withExt;
    } catch {
      // File doesn't exist
    }
  }

  // Try index files
  for (const indexFile of indexFiles) {
    const withIndex = resolved + indexFile;
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(withIndex));
      return withIndex;
    } catch {
      // File doesn't exist
    }
  }

  return null;
}

function calculateNameSimilarity(name1: string, name2: string): number {
  // Simple similarity calculation based on common characters and length
  const longer = name1.length > name2.length ? name1 : name2;
  const shorter = name1.length > name2.length ? name2 : name1;

  if (longer.length === 0) return 1;

  // Check for exact substring match
  if (longer.toLowerCase().includes(shorter.toLowerCase())) {
    return 0.8;
  }

  // Calculate character overlap
  let commonChars = 0;
  const shorterChars = shorter.toLowerCase().split("");
  const longerChars = longer.toLowerCase().split("");

  for (const char of shorterChars) {
    const index = longerChars.indexOf(char);
    if (index !== -1) {
      commonChars++;
      longerChars.splice(index, 1);
    }
  }

  return commonChars / longer.length;
}

async function readFileContent(filePath: string): Promise<string | null> {
  try {
    const uri = vscode.Uri.file(filePath);
    const content = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(content).toString("utf8");
  } catch {
    return null;
  }
}

function formatRelatedFiles(
  files: Array<{
    path: string;
    relationship: string;
    confidence: number;
    description: string;
  }>,
  sourceFile: string
): string {
  if (files.length === 0) {
    return `No related files found for ${sourceFile}`;
  }

  let output = `📎 Related files for ${sourceFile}:\n\n`;

  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.relationship]) {
      acc[file.relationship] = [];
    }
    acc[file.relationship].push(file);
    return acc;
  }, {} as Record<string, typeof files>);

  for (const [relationship, relationFiles] of Object.entries(groupedFiles)) {
    const icon = getRelationshipIcon(relationship);
    output += `${icon} ${relationship.toUpperCase()} FILES:\n`;

    for (const file of relationFiles) {
      const confidence = Math.round(file.confidence * 100);
      output += `  📄 ${file.path} (${confidence}% confidence)\n`;
      output += `      ${file.description}\n`;
    }
    output += "\n";
  }

  return output.trim();
}

function getRelationshipIcon(relationship: string): string {
  const icons = {
    import: "📥",
    test: "🧪",
    type: "📋",
    similar: "🔍",
    config: "⚙️",
  };
  return icons[relationship as keyof typeof icons] || "📄";
}
