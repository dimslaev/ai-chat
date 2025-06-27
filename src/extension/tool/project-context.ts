import * as vscode from "vscode";
import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";

const DESCRIPTION = `Analyze the overall project structure, patterns, frameworks, and development context.
- Detects project type (React, Node.js, etc.)
- Identifies frameworks and libraries in use
- Analyzes code patterns and architecture
- Examines testing setup and configuration
- Provides insights about project conventions`;

export const ProjectContextTool = Tool.define({
  id: "analyze_project_context",
  description: DESCRIPTION,
  parameters: z.object({
    analysisDepth: z
      .enum(["shallow", "medium", "deep"])
      .optional()
      .default("medium")
      .describe("Depth of analysis to perform"),
    focusAreas: z
      .array(
        z.enum([
          "architecture",
          "patterns",
          "dependencies",
          "testing",
          "documentation",
          "configuration",
        ])
      )
      .optional()
      .default(["architecture", "patterns", "dependencies"])
      .describe("Specific areas to focus the analysis on"),
  }),
  async execute(params, ctx) {
    const { analysisDepth, focusAreas } = params;

    try {
      const analysis = {
        projectType: await detectProjectType(ctx.workspaceRoot),
        frameworks: await detectFrameworks(ctx.workspaceRoot),
        languages: await detectLanguages(ctx.workspaceRoot),
        patterns: [] as string[],
        testingSetup: null as string | null,
        dependencies: [] as string[],
        configuration: [] as string[],
        structure: null as string | null,
      };

      if (focusAreas.includes("patterns")) {
        analysis.patterns = await detectCodePatterns(
          ctx.workspaceRoot,
          analysisDepth
        );
      }

      if (focusAreas.includes("testing")) {
        analysis.testingSetup = await analyzeTestingSetup(ctx.workspaceRoot);
      }

      if (focusAreas.includes("dependencies")) {
        analysis.dependencies = await analyzeDependencies(ctx.workspaceRoot);
      }

      if (focusAreas.includes("configuration")) {
        analysis.configuration = await analyzeConfiguration(ctx.workspaceRoot);
      }

      if (focusAreas.includes("architecture")) {
        analysis.structure = await analyzeProjectStructure(
          ctx.workspaceRoot,
          analysisDepth
        );
      }

      let output = `🏗️ Project Context Analysis\n\n`;

      output += `**Project Type:** ${analysis.projectType}\n`;
      output += `**Primary Languages:** ${analysis.languages
        .slice(0, 3)
        .join(", ")}\n`;

      if (analysis.frameworks.length > 0) {
        output += `**Frameworks & Libraries:** ${analysis.frameworks
          .slice(0, 5)
          .join(", ")}\n`;
      }

      if (analysis.patterns.length > 0) {
        output += `\n**Code Patterns:**\n${analysis.patterns
          .map((p) => `• ${p}`)
          .join("\n")}\n`;
      }

      if (analysis.testingSetup) {
        output += `\n**Testing Setup:** ${analysis.testingSetup}\n`;
      }

      if (analysis.dependencies.length > 0) {
        output += `\n**Key Dependencies:** ${analysis.dependencies
          .slice(0, 8)
          .join(", ")}\n`;
      }

      if (analysis.configuration.length > 0) {
        output += `\n**Configuration Files:**\n${analysis.configuration
          .map((c) => `• ${c}`)
          .join("\n")}\n`;
      }

      if (analysis.structure) {
        output += `\n**Project Structure:**\n${analysis.structure}\n`;
      }

      return {
        output,
        metadata: {
          analysisDepth,
          focusAreas,
          ...analysis,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        output: `❌ Error analyzing project context: ${errorMessage}`,
        metadata: { error: errorMessage },
      };
    }
  },
});

async function detectProjectType(workspaceRoot: string): Promise<string> {
  const packageJsonPath = path.join(workspaceRoot, "package.json");

  try {
    const packageUri = vscode.Uri.file(packageJsonPath);
    const packageData = await vscode.workspace.fs.readFile(packageUri);
    const packageJson = JSON.parse(Buffer.from(packageData).toString("utf8"));

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // React project
    if (dependencies.react || dependencies["@types/react"]) {
      if (dependencies.next || dependencies["next"])
        return "Next.js Application";
      if (dependencies.gatsby) return "Gatsby Application";
      if (dependencies["react-native"]) return "React Native Application";
      return "React Application";
    }

    // Vue project
    if (dependencies.vue || dependencies["@vue/cli"]) {
      return "Vue.js Application";
    }

    // Angular project
    if (dependencies["@angular/core"]) {
      return "Angular Application";
    }

    // Node.js/Express
    if (dependencies.express) {
      return "Express.js Server";
    }

    // Electron
    if (dependencies.electron) {
      return "Electron Application";
    }

    // Check if it's a library/package
    if (packageJson.main || packageJson.module || packageJson.exports) {
      return "npm Package/Library";
    }

    return "Node.js Project";
  } catch {
    // No package.json, check for other indicators
    const files = await getDirectoryFiles(workspaceRoot);

    if (files.includes("Cargo.toml")) return "Rust Project";
    if (files.includes("go.mod")) return "Go Project";
    if (files.includes("requirements.txt") || files.includes("pyproject.toml"))
      return "Python Project";
    if (files.includes("pom.xml") || files.includes("build.gradle"))
      return "Java Project";

    return "Unknown Project Type";
  }
}

async function detectFrameworks(workspaceRoot: string): Promise<string[]> {
  const frameworks = [];

  try {
    const packageJsonPath = path.join(workspaceRoot, "package.json");
    const packageUri = vscode.Uri.file(packageJsonPath);
    const packageData = await vscode.workspace.fs.readFile(packageUri);
    const packageJson = JSON.parse(Buffer.from(packageData).toString("utf8"));

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Frontend frameworks
    if (allDeps.react) frameworks.push("React");
    if (allDeps.vue) frameworks.push("Vue.js");
    if (allDeps["@angular/core"]) frameworks.push("Angular");
    if (allDeps.svelte) frameworks.push("Svelte");

    // Meta-frameworks
    if (allDeps.next) frameworks.push("Next.js");
    if (allDeps.gatsby) frameworks.push("Gatsby");
    if (allDeps.nuxt) frameworks.push("Nuxt.js");

    // Backend frameworks
    if (allDeps.express) frameworks.push("Express.js");
    if (allDeps.fastify) frameworks.push("Fastify");
    if (allDeps.koa) frameworks.push("Koa");
    if (allDeps.nestjs) frameworks.push("NestJS");

    // Testing frameworks
    if (allDeps.jest) frameworks.push("Jest");
    if (allDeps.mocha) frameworks.push("Mocha");
    if (allDeps.vitest) frameworks.push("Vitest");
    if (allDeps.cypress) frameworks.push("Cypress");
    if (allDeps.playwright) frameworks.push("Playwright");

    // Build tools
    if (allDeps.webpack) frameworks.push("Webpack");
    if (allDeps.vite) frameworks.push("Vite");
    if (allDeps.rollup) frameworks.push("Rollup");
    if (allDeps.parcel) frameworks.push("Parcel");

    // UI Libraries
    if (allDeps["@mui/material"]) frameworks.push("Material-UI");
    if (allDeps["antd"]) frameworks.push("Ant Design");
    if (allDeps["react-bootstrap"]) frameworks.push("React Bootstrap");
    if (allDeps["tailwindcss"]) frameworks.push("Tailwind CSS");

    // State management
    if (allDeps.redux) frameworks.push("Redux");
    if (allDeps.zustand) frameworks.push("Zustand");
    if (allDeps.mobx) frameworks.push("MobX");

    // Development tools
    if (allDeps.typescript) frameworks.push("TypeScript");
    if (allDeps.eslint) frameworks.push("ESLint");
    if (allDeps.prettier) frameworks.push("Prettier");
  } catch {
    // Couldn't read package.json
  }

  return frameworks;
}

async function detectLanguages(workspaceRoot: string): Promise<string[]> {
  const languages = new Set<string>();
  const fileExtensions = new Set<string>();

  try {
    // Get a sample of files to analyze
    const files = await getAllFiles(workspaceRoot, 100);

    files.forEach((file) => {
      const ext = path.extname(file).toLowerCase();
      if (ext) fileExtensions.add(ext);
    });

    // Map extensions to languages
    const extToLang = {
      ".js": "JavaScript",
      ".jsx": "JavaScript (JSX)",
      ".ts": "TypeScript",
      ".tsx": "TypeScript (TSX)",
      ".py": "Python",
      ".java": "Java",
      ".go": "Go",
      ".rs": "Rust",
      ".c": "C",
      ".cpp": "C++",
      ".cs": "C#",
      ".rb": "Ruby",
      ".php": "PHP",
      ".swift": "Swift",
      ".kt": "Kotlin",
      ".dart": "Dart",
      ".vue": "Vue",
      ".svelte": "Svelte",
    };

    fileExtensions.forEach((ext) => {
      if (extToLang[ext as keyof typeof extToLang]) {
        languages.add(extToLang[ext as keyof typeof extToLang]);
      }
    });
  } catch (error) {
    // Fallback
    languages.add("Unknown");
  }

  return Array.from(languages);
}

async function detectCodePatterns(
  workspaceRoot: string,
  depth: string
): Promise<string[]> {
  const patterns = [];

  try {
    const files = await getAllFiles(workspaceRoot, depth === "deep" ? 200 : 50);
    const sampleFiles = files
      .filter(
        (f) =>
          /\.(js|jsx|ts|tsx)$/.test(f) &&
          !f.includes("node_modules") &&
          !f.includes("dist/") &&
          !f.includes("build/")
      )
      .slice(0, depth === "shallow" ? 10 : depth === "medium" ? 25 : 50);

    let totalContent = "";
    for (const file of sampleFiles) {
      try {
        const uri = vscode.Uri.file(path.join(workspaceRoot, file));
        const data = await vscode.workspace.fs.readFile(uri);
        totalContent += Buffer.from(data).toString("utf8") + "\n";
      } catch {
        // Skip files that can't be read
      }
    }

    // Analyze patterns
    if (
      totalContent.includes("export default") ||
      totalContent.includes("export {")
    ) {
      patterns.push("ES6 Modules");
    }

    if (
      totalContent.includes("import React") ||
      totalContent.includes("from 'react'")
    ) {
      patterns.push("React Components");
    }

    if (
      totalContent.includes("useState") ||
      totalContent.includes("useEffect")
    ) {
      patterns.push("React Hooks");
    }

    if (
      totalContent.includes("describe(") ||
      totalContent.includes("it(") ||
      totalContent.includes("test(")
    ) {
      patterns.push("Unit Testing");
    }

    if (totalContent.includes("async") && totalContent.includes("await")) {
      patterns.push("Async/Await Pattern");
    }

    if (totalContent.includes("Promise") || totalContent.includes(".then(")) {
      patterns.push("Promise-based Architecture");
    }

    if (totalContent.includes("class ") && totalContent.includes("extends")) {
      patterns.push("Object-Oriented Programming");
    }

    if (totalContent.includes("interface ") || totalContent.includes("type ")) {
      patterns.push("TypeScript Type Definitions");
    }

    if (totalContent.includes("const ") && totalContent.includes("=>")) {
      patterns.push("Functional Programming");
    }

    if (totalContent.includes("try {") && totalContent.includes("catch")) {
      patterns.push("Error Handling");
    }
  } catch (error) {
    patterns.push("Analysis failed");
  }

  return patterns;
}

async function analyzeTestingSetup(workspaceRoot: string): Promise<string> {
  try {
    const packageJsonPath = path.join(workspaceRoot, "package.json");
    const packageUri = vscode.Uri.file(packageJsonPath);
    const packageData = await vscode.workspace.fs.readFile(packageUri);
    const packageJson = JSON.parse(Buffer.from(packageData).toString("utf8"));

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const testFrameworks = [];
    if (allDeps.jest) testFrameworks.push("Jest");
    if (allDeps.mocha) testFrameworks.push("Mocha");
    if (allDeps.vitest) testFrameworks.push("Vitest");
    if (allDeps.jasmine) testFrameworks.push("Jasmine");

    const e2eFrameworks = [];
    if (allDeps.cypress) e2eFrameworks.push("Cypress");
    if (allDeps.playwright) e2eFrameworks.push("Playwright");
    if (allDeps.puppeteer) e2eFrameworks.push("Puppeteer");

    let setup = "";
    if (testFrameworks.length > 0) {
      setup += `Unit Testing: ${testFrameworks.join(", ")}`;
    }
    if (e2eFrameworks.length > 0) {
      if (setup) setup += ", ";
      setup += `E2E Testing: ${e2eFrameworks.join(", ")}`;
    }

    return setup || "No testing framework detected";
  } catch {
    return "Could not analyze testing setup";
  }
}

async function analyzeDependencies(workspaceRoot: string): Promise<string[]> {
  try {
    const packageJsonPath = path.join(workspaceRoot, "package.json");
    const packageUri = vscode.Uri.file(packageJsonPath);
    const packageData = await vscode.workspace.fs.readFile(packageUri);
    const packageJson = JSON.parse(Buffer.from(packageData).toString("utf8"));

    const dependencies = Object.keys(packageJson.dependencies || {});
    return dependencies.slice(0, 15); // Return top 15 dependencies
  } catch {
    return [];
  }
}

async function analyzeConfiguration(workspaceRoot: string): Promise<string[]> {
  const configFiles = [];
  const commonConfigs = [
    "tsconfig.json",
    ".eslintrc.js",
    ".eslintrc.json",
    ".prettierrc",
    "jest.config.js",
    "webpack.config.js",
    "vite.config.js",
    "tailwind.config.js",
    ".babelrc",
    "rollup.config.js",
    "next.config.js",
    ".env",
    ".gitignore",
  ];

  for (const config of commonConfigs) {
    try {
      const configPath = path.join(workspaceRoot, config);
      const uri = vscode.Uri.file(configPath);
      await vscode.workspace.fs.stat(uri);
      configFiles.push(config);
    } catch {
      // File doesn't exist
    }
  }

  return configFiles;
}

async function analyzeProjectStructure(
  workspaceRoot: string,
  depth: string
): Promise<string> {
  try {
    const dirs = await getTopLevelDirectories(workspaceRoot);

    const structure = [];
    const importantDirs = [
      "src",
      "lib",
      "components",
      "pages",
      "api",
      "utils",
      "hooks",
      "styles",
      "test",
      "tests",
      "__tests__",
    ];

    for (const dir of dirs) {
      if (importantDirs.includes(dir) || depth === "deep") {
        const subdirs = await getDirectoryFiles(path.join(workspaceRoot, dir));
        structure.push(`${dir}/ (${subdirs.length} items)`);
      }
    }

    return structure.join(", ");
  } catch {
    return "Could not analyze project structure";
  }
}

async function getDirectoryFiles(dirPath: string): Promise<string[]> {
  try {
    const uri = vscode.Uri.file(dirPath);
    const entries = await vscode.workspace.fs.readDirectory(uri);
    return entries.map(([name]) => name);
  } catch {
    return [];
  }
}

async function getTopLevelDirectories(
  workspaceRoot: string
): Promise<string[]> {
  try {
    const uri = vscode.Uri.file(workspaceRoot);
    const entries = await vscode.workspace.fs.readDirectory(uri);
    return entries
      .filter(([_, type]) => type === vscode.FileType.Directory)
      .map(([name]) => name)
      .filter((name) => !name.startsWith(".") && name !== "node_modules");
  } catch {
    return [];
  }
}

async function getAllFiles(
  workspaceRoot: string,
  maxFiles: number
): Promise<string[]> {
  const files: string[] = [];

  async function walkDir(
    dirPath: string,
    relativePath: string = ""
  ): Promise<void> {
    if (files.length >= maxFiles) return;

    try {
      const uri = vscode.Uri.file(dirPath);
      const entries = await vscode.workspace.fs.readDirectory(uri);

      for (const [name, type] of entries) {
        if (files.length >= maxFiles) break;

        const fullPath = path.join(dirPath, name);
        const relPath = path.join(relativePath, name);

        if (name.startsWith(".") || name === "node_modules") continue;

        if (type === vscode.FileType.File) {
          files.push(relPath);
        } else if (type === vscode.FileType.Directory) {
          await walkDir(fullPath, relPath);
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  await walkDir(workspaceRoot);
  return files;
}
