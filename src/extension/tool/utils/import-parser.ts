export interface ImportInfo {
  source: string;
  resolvedPath: string | null;
  type: "relative" | "package";
  line: number;
  isAsync: boolean;
  importedNames?: string[];
}

export interface ExportInfo {
  name: string;
  type: "named" | "default" | "reexport";
  source?: string;
  line: number;
}

/**
 * Parse imports and exports from source code
 */
export function parseImportsExports(content: string): {
  imports: ImportInfo[];
  exports: ExportInfo[];
} {
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];
  const lines = content.split("\n");

  // Import patterns
  const importRegex = /import.*?from\s+['"`]([^'"`]+)['"`]/g;
  const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
  const dynamicImportRegex = /import\(['"`]([^'"`]+)['"`]\)/g;

  // Export patterns
  const exportRegex = /^export\s+(.*?)(\s+from\s+['"`]([^'"`]+)['"`])?/gm;
  const exportDefaultRegex = /^export\s+default\s+/gm;

  // Parse imports
  lines.forEach((line, index) => {
    let match;

    // Regular imports
    while ((match = importRegex.exec(line)) !== null) {
      imports.push(createImportInfo(match[1], index + 1, false, line));
    }

    // Require statements
    while ((match = requireRegex.exec(line)) !== null) {
      imports.push(createImportInfo(match[1], index + 1, false, line));
    }

    // Dynamic imports
    while ((match = dynamicImportRegex.exec(line)) !== null) {
      imports.push(createImportInfo(match[1], index + 1, true, line));
    }
  });

  // Parse exports
  lines.forEach((line, index) => {
    let match;

    // Named/re-exports
    exportRegex.lastIndex = 0;
    while ((match = exportRegex.exec(line)) !== null) {
      const exportName = extractExportName(match[1]);
      const source = match[3];

      exports.push({
        name: exportName,
        type: source ? "reexport" : "named",
        source,
        line: index + 1,
      });
    }

    // Default exports
    exportDefaultRegex.lastIndex = 0;
    if (exportDefaultRegex.test(line)) {
      exports.push({
        name: "default",
        type: "default",
        line: index + 1,
      });
    }
  });

  return { imports, exports };
}

/**
 * Extract imported names from an import line
 */
export function extractImportedNames(importLine: string): string[] {
  const names: string[] = [];

  // Match: import { name1, name2 } from '...'
  const namedMatch = importLine.match(/import\s*{\s*([^}]+)\s*}/);
  if (namedMatch) {
    return namedMatch[1]
      .split(",")
      .map((name) => name.trim().split(" as ")[0].trim())
      .filter((name) => name);
  }

  // Match: import defaultName from '...'
  const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
  if (defaultMatch) {
    names.push(defaultMatch[1]);
  }

  // Match: import * as namespace from '...'
  const namespaceMatch = importLine.match(/import\s+\*\s+as\s+(\w+)/);
  if (namespaceMatch) {
    names.push(namespaceMatch[1]);
  }

  return names;
}

/**
 * Check if an import path is relative
 */
export function isRelativeImport(importPath: string): boolean {
  return importPath.startsWith("./") || importPath.startsWith("../");
}

/**
 * Check if an import is a Node.js built-in module
 */
export function isNodeBuiltin(importPath: string): boolean {
  const builtins = [
    "fs",
    "path",
    "os",
    "util",
    "crypto",
    "events",
    "stream",
    "http",
    "https",
    "url",
    "querystring",
    "child_process",
    "cluster",
    "worker_threads",
    "async_hooks",
    "buffer",
    "console",
    "constants",
    "dgram",
    "dns",
    "domain",
    "inspector",
    "module",
    "net",
    "perf_hooks",
    "process",
    "punycode",
    "readline",
    "repl",
    "string_decoder",
    "timers",
    "tls",
    "trace_events",
    "tty",
    "v8",
    "vm",
    "wasi",
    "zlib",
  ];

  return builtins.includes(importPath) || importPath.startsWith("node:");
}

function createImportInfo(
  source: string,
  line: number,
  isAsync: boolean,
  fullLine: string
): ImportInfo {
  return {
    source,
    resolvedPath: null, // Will be resolved later if needed
    type: isRelativeImport(source) ? "relative" : "package",
    line,
    isAsync,
    importedNames: extractImportedNames(fullLine),
  };
}

function extractExportName(exportDeclaration: string): string {
  // Handle various export patterns
  if (exportDeclaration.includes("function")) {
    const match = exportDeclaration.match(/function\s+(\w+)/);
    return match ? match[1] : "unknown";
  }

  if (exportDeclaration.includes("class")) {
    const match = exportDeclaration.match(/class\s+(\w+)/);
    return match ? match[1] : "unknown";
  }

  if (
    exportDeclaration.includes("const") ||
    exportDeclaration.includes("let") ||
    exportDeclaration.includes("var")
  ) {
    const match = exportDeclaration.match(/(const|let|var)\s+(\w+)/);
    return match ? match[2] : "unknown";
  }

  // Handle export { name } syntax
  const braceMatch = exportDeclaration.match(/{\s*(\w+)/);
  if (braceMatch) {
    return braceMatch[1];
  }

  return exportDeclaration.trim() || "unknown";
}
