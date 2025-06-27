import * as vscode from "vscode";
import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";
import {
  openDocument,
  getDocumentSymbols,
  getRelativePath,
  parseImportsExports,
  getReferences,
} from "./utils";

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
    try {
      // Open the document to ensure language services are active
      const document = await openDocument(params.filePath, ctx.workspaceRoot);

      const result = {
        symbols: [] as SymbolInfo[],
        imports: [] as ImportInfo[],
        exports: [] as ExportInfo[],
        references: [] as ReferenceInfo[],
        structure: "",
      };

      // Get document symbols (functions, classes, variables, etc.)
      if (["structure", "symbols", "full"].includes(params.analysisType)) {
        result.symbols = await analyzeSymbols(document.uri, document);
      }

      // Analyze imports and exports
      if (["structure", "imports", "full"].includes(params.analysisType)) {
        const { imports, exports } = parseImportsExports(document.getText());
        result.imports = imports.map((imp) => ({
          ...imp,
          resolvedPath: imp.resolvedPath || null,
        }));
        result.exports = exports;
      }

      // Get cross-references
      if (
        params.includeReferences ||
        params.analysisType === "references" ||
        params.analysisType === "full"
      ) {
        result.references = await analyzeReferences(
          document.uri,
          document,
          result.symbols,
          params.maxReferences
        );
      }

      // Generate structured output
      result.structure = formatAnalysisOutput(result, params.analysisType);

      const relativePath = getRelativePath(
        document.uri.fsPath,
        ctx.workspaceRoot
      );

      return {
        output: result.structure,
        metadata: {
          title: `Analysis: ${path.basename(params.filePath)}`,
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
    const symbols = await getDocumentSymbols(uri);
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

      const refs = await getReferences(uri, position, true);
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
