import * as vscode from "vscode";
import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";

const DESCRIPTION = `Analyze code structure and extract functions, classes, imports, exports.
- Code review and understanding unfamiliar codebases
- Refactoring impact analysis (find all references before making changes)
- Dependency analysis and import mapping
- API surface discovery (extract all public functions/classes)
- Documentation generation (get structured symbol information)
- Architecture analysis and code exploration`;

interface SymbolInfo {
  name: string;
  kind: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  selectionRange: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  parent: string | null;
  detail: string;
  children: number;
  signature?: string;
  isAsync?: boolean;
  parameters?: string[];
}

interface ImportInfo {
  source: string;
  resolvedPath: string | null;
  type: "relative" | "package";
  line: number;
  isAsync: boolean;
}

interface ExportInfo {
  name: string;
  type: "named" | "default" | "reexport";
  source?: string;
  line: number;
}

interface ReferenceInfo {
  symbol: string;
  kind: string;
  referenceCount: number;
  references: Array<{
    uri: string;
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  }>;
}

export const AnalyzeASTTool = Tool.define({
  id: "analyze_ast",
  description: DESCRIPTION,
  parameters: z.object({
    filePath: z
      .string()
      .describe("Path to the file to analyze, relative to workspace root"),
    analysisType: z
      .enum([
        "structure", // Overall file structure
        "symbols", // Functions, classes, variables
        "imports", // Import/export analysis
        "references", // Cross-reference analysis
        "full", // Complete analysis
      ])
      .optional()
      .default("structure")
      .describe("Type of analysis to perform"),
    includeReferences: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include reference locations for symbols"),
    maxReferences: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of references to include per symbol"),
  }),
  async execute(params, ctx) {
    let filePath = params.filePath;
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(ctx.workspaceRoot, filePath);
    }

    const uri = vscode.Uri.file(filePath);

    try {
      // Open the document to ensure language services are active
      const document = await vscode.workspace.openTextDocument(uri);

      const result = {
        symbols: [] as SymbolInfo[],
        imports: [] as ImportInfo[],
        exports: [] as ExportInfo[],
        references: [] as ReferenceInfo[],
        structure: "",
      };

      // Get document symbols (functions, classes, variables, etc.)
      if (["structure", "symbols", "full"].includes(params.analysisType)) {
        result.symbols = await analyzeSymbols(uri, document);
      }

      // Analyze imports and exports
      if (["structure", "imports", "full"].includes(params.analysisType)) {
        const importExportData = await analyzeImportsExports(
          document,
          ctx.workspaceRoot
        );
        result.imports = importExportData.imports;
        result.exports = importExportData.exports;
      }

      // Get cross-references
      if (
        params.includeReferences ||
        params.analysisType === "references" ||
        params.analysisType === "full"
      ) {
        result.references = await analyzeReferences(
          uri,
          document,
          result.symbols,
          params.maxReferences
        );
      }

      // Generate structured output
      result.structure = formatAnalysisOutput(result, params.analysisType);

      const relativePath = path.relative(ctx.workspaceRoot, filePath);

      return {
        output: result.structure,
        metadata: {
          title: `Analysis: ${path.basename(filePath)}`,
          language: document.languageId,
          filePath: relativePath,
          symbolCount: result.symbols.length,
          importCount: result.imports.length,
          exportCount: result.exports.length,
          analysisType: params.analysisType,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to analyze file ${params.filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

// Helper functions

async function analyzeSymbols(
  uri: vscode.Uri,
  document: vscode.TextDocument
): Promise<SymbolInfo[]> {
  try {
    const symbols = await vscode.commands.executeCommand<
      vscode.DocumentSymbol[]
    >("vscode.executeDocumentSymbolProvider", uri);
    if (!symbols) return [];

    const flatSymbols: SymbolInfo[] = [];

    const flattenSymbols = (
      symbolList: vscode.DocumentSymbol[],
      parent?: string
    ) => {
      for (const symbol of symbolList) {
        const symbolInfo: SymbolInfo = {
          name: symbol.name,
          kind: vscode.SymbolKind[symbol.kind],
          range: {
            start: {
              line: symbol.range.start.line,
              character: symbol.range.start.character,
            },
            end: {
              line: symbol.range.end.line,
              character: symbol.range.end.character,
            },
          },
          selectionRange: {
            start: {
              line: symbol.selectionRange.start.line,
              character: symbol.selectionRange.start.character,
            },
            end: {
              line: symbol.selectionRange.end.line,
              character: symbol.selectionRange.end.character,
            },
          },
          parent: parent || null,
          detail: symbol.detail || "",
          children: symbol.children?.length || 0,
        };

        // Add function-specific info
        if (
          symbol.kind === vscode.SymbolKind.Function ||
          symbol.kind === vscode.SymbolKind.Method
        ) {
          const lineText = document.lineAt(
            symbol.selectionRange.start.line
          ).text;
          symbolInfo.signature = extractSignature(lineText, symbol.name);
          symbolInfo.isAsync = lineText.includes("async");
          symbolInfo.parameters = extractParameters(lineText);
        }

        flatSymbols.push(symbolInfo);

        // Recursively process children
        if (symbol.children && symbol.children.length > 0) {
          flattenSymbols(symbol.children, symbol.name);
        }
      }
    };

    flattenSymbols(symbols);
    return flatSymbols;
  } catch (error) {
    console.warn("Failed to get document symbols:", error);
    return [];
  }
}

async function analyzeImportsExports(
  document: vscode.TextDocument,
  workspaceRoot: string
): Promise<{ imports: ImportInfo[]; exports: ExportInfo[] }> {
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];
  const content = document.getText();
  const uri = document.uri;

  // Regex patterns for different import/export styles
  const importPatterns = [
    /import\s+(?:{[^}]*}|[\w\s,*]+)\s+from\s+['"]([^'"]+)['"];?/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:const|let|var)\s+[\w\s{},*]+\s*=\s*require\(['"]([^'"]+)['"]\)/g,
  ];

  const exportPatterns = [
    /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g,
    /export\s*{\s*([^}]+)\s*}/g,
    /export\s+\*\s+from\s+['"]([^'"]+)['"];?/g,
  ];

  // Analyze imports
  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      const line = content.substring(0, match.index).split("\n").length;

      // Try to resolve the import using VS Code's definition provider
      let resolvedPath: string | null = null;
      try {
        const position = new vscode.Position(line - 1, match.index);
        const definitions = await vscode.commands.executeCommand<
          vscode.Location[]
        >("vscode.executeDefinitionProvider", uri, position);
        if (definitions && definitions.length > 0) {
          const def = Array.isArray(definitions) ? definitions[0] : definitions;
          resolvedPath = path.relative(workspaceRoot, def.uri.fsPath);
        }
      } catch (error) {
        // Fallback to manual resolution
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          resolvedPath = resolveRelativeImport(
            document.uri.fsPath,
            importPath,
            workspaceRoot
          );
        }
      }

      imports.push({
        source: importPath,
        resolvedPath,
        type: importPath.startsWith(".") ? "relative" : "package",
        line,
        isAsync: match[0].includes("import("),
      });
    }
  }

  // Analyze exports
  for (const pattern of exportPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const line = content.substring(0, match.index).split("\n").length;

      if (pattern.source.includes("export\\s*\\{")) {
        // Named exports
        const namedExports = match[1]
          .split(",")
          .map((e) => e.trim().split(" as ")[0].trim());
        namedExports.forEach((name) => {
          if (name) {
            exports.push({
              name,
              type: "named",
              line,
            });
          }
        });
      } else if (pattern.source.includes("export\\s+\\*")) {
        // Re-export
        exports.push({
          name: "*",
          type: "reexport",
          source: match[1],
          line,
        });
      } else {
        // Default or named declaration export
        exports.push({
          name: match[1],
          type: match[0].includes("default") ? "default" : "named",
          line,
        });
      }
    }
  }

  return { imports, exports };
}

async function analyzeReferences(
  uri: vscode.Uri,
  document: vscode.TextDocument,
  symbols: SymbolInfo[],
  maxReferences: number
): Promise<ReferenceInfo[]> {
  const references: ReferenceInfo[] = [];

  for (const symbol of symbols.slice(0, 10)) {
    // Limit to avoid performance issues
    try {
      const position = new vscode.Position(
        symbol.selectionRange.start.line,
        symbol.selectionRange.start.character
      );

      const refs = await vscode.commands.executeCommand<vscode.Location[]>(
        "vscode.executeReferenceProvider",
        uri,
        position
      );
      if (refs && refs.length > 0) {
        const limitedRefs = refs
          .slice(0, maxReferences)
          .map((ref: vscode.Location) => ({
            uri: ref.uri.toString(),
            range: {
              start: {
                line: ref.range.start.line,
                character: ref.range.start.character,
              },
              end: {
                line: ref.range.end.line,
                character: ref.range.end.character,
              },
            },
          }));

        references.push({
          symbol: symbol.name,
          kind: symbol.kind,
          referenceCount: refs.length,
          references: limitedRefs,
        });
      }
    } catch (error) {
      // Skip symbols that can't be analyzed
    }
  }

  return references;
}

// Utility functions

function extractSignature(lineText: string, functionName: string): string {
  const funcIndex = lineText.indexOf(functionName);
  if (funcIndex === -1) return lineText.trim();

  const parenIndex = lineText.indexOf("(", funcIndex);
  const endParenIndex = lineText.indexOf(")", parenIndex);

  if (parenIndex !== -1 && endParenIndex !== -1) {
    return lineText.substring(0, endParenIndex + 1).trim();
  }

  return lineText.trim();
}

function extractParameters(lineText: string): string[] {
  const match = lineText.match(/\(([^)]*)\)/);
  if (!match || !match[1].trim()) return [];

  return match[1]
    .split(",")
    .map((param) => param.trim().split(/[:\s=]/)[0])
    .filter((param) => param.length > 0);
}

function resolveRelativeImport(
  currentFile: string,
  importPath: string,
  workspaceRoot: string
): string | null {
  try {
    const currentDir = path.dirname(currentFile);
    const resolved = path.resolve(currentDir, importPath);

    // Try common extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      try {
        require("fs").statSync(withExt);
        return path.relative(workspaceRoot, withExt);
      } catch {
        // File doesn't exist, continue
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexFile = path.join(resolved, `index${ext}`);
      try {
        require("fs").statSync(indexFile);
        return path.relative(workspaceRoot, indexFile);
      } catch {
        // File doesn't exist, continue
      }
    }
  } catch (error) {
    // Ignore resolution errors
  }

  return null;
}

function formatAnalysisOutput(
  result: {
    symbols: SymbolInfo[];
    imports: ImportInfo[];
    exports: ExportInfo[];
    references: ReferenceInfo[];
  },
  analysisType: string
): string {
  let output = "";

  if (analysisType === "structure" || analysisType === "full") {
    output += "Code Structure Analysis\n\n";
  }

  if (
    (analysisType === "symbols" ||
      analysisType === "structure" ||
      analysisType === "full") &&
    result.symbols.length > 0
  ) {
    output += "Symbols:\n";

    const grouped = result.symbols.reduce(
      (acc: Record<string, SymbolInfo[]>, symbol) => {
        acc[symbol.kind] = acc[symbol.kind] || [];
        acc[symbol.kind].push(symbol);
        return acc;
      },
      {}
    );

    for (const [kind, symbols] of Object.entries(grouped)) {
      output += `\n${kind}s:\n`;
      symbols.forEach((symbol: SymbolInfo) => {
        output += `- ${symbol.name}`;
        if (symbol.signature) {
          output += ` -> ${symbol.signature}`;
        }
        if (symbol.parameters && symbol.parameters.length > 0) {
          output += ` (${symbol.parameters.join(", ")})`;
        }
        output += ` [Line ${symbol.range.start.line + 1}]`;
        if (symbol.parent) {
          output += ` (in ${symbol.parent})`;
        }
        output += "\n";
      });
    }
    output += "\n";
  }

  if (
    (analysisType === "imports" ||
      analysisType === "structure" ||
      analysisType === "full") &&
    (result.imports.length > 0 || result.exports.length > 0)
  ) {
    if (result.imports.length > 0) {
      output += "Imports:\n";
      result.imports.forEach((imp: ImportInfo) => {
        output += `- ${imp.source}`;
        if (imp.resolvedPath) {
          output += ` -> ${imp.resolvedPath}`;
        }
        output += ` (${imp.type})`;
        if (imp.isAsync) {
          output += " [async]";
        }
        output += `\n`;
      });
      output += "\n";
    }

    if (result.exports.length > 0) {
      output += "Exports:\n";
      result.exports.forEach((exp: ExportInfo) => {
        output += `- ${exp.name} (${exp.type})`;
        if (exp.source) {
          output += ` from ${exp.source}`;
        }
        output += `\n`;
      });
      output += "\n";
    }
  }

  if (
    (analysisType === "references" || analysisType === "full") &&
    result.references.length > 0
  ) {
    output += "References:\n";
    result.references.forEach((ref: ReferenceInfo) => {
      output += `- ${ref.symbol} (${ref.kind}) - ${ref.referenceCount} references\n`;
      if (ref.references.length > 0) {
        ref.references.slice(0, 3).forEach((reference) => {
          output += `  └─ Line ${reference.range.start.line + 1}\n`;
        });
        if (ref.references.length > 3) {
          output += `  └─ ... and ${ref.references.length - 3} more\n`;
        }
      }
    });
    output += "\n";
  }

  return output;
}
