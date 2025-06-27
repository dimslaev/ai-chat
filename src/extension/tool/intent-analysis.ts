import * as path from "path";
import { z } from "zod";
import { Tool } from "./tool";
import {
  getCurrentEditorContext,
  getRelativePath,
  isInWorkspace,
} from "./utils";

const DESCRIPTION = `Analyze user intent based on current context, recent actions, and conversation history.
- Infers what the user is trying to accomplish
- Suggests relevant actions and next steps
- Analyzes patterns in user behavior and code context
- Provides personalized assistance recommendations`;

export const IntentAnalysisTool = Tool.define({
  id: "analyze_user_intent",
  description: DESCRIPTION,
  parameters: z.object({
    recentMessages: z
      .array(z.string())
      .optional()
      .describe("Recent conversation messages for context"),
    contextClues: z
      .array(z.string())
      .optional()
      .describe("Additional context clues about user actions"),
  }),
  async execute(params, ctx) {
    try {
      const { recentMessages = [], contextClues = [] } = params;

      // Get current editor context
      const { editor, document, selection } = getCurrentEditorContext();
      let currentContext = "";
      let filePath = "";
      let fileType = "";

      if (editor && document && isInWorkspace(document.uri)) {
        filePath = getRelativePath(document.uri.fsPath, ctx.workspaceRoot);
        fileType = document.languageId;
        const selectedText = selection?.isEmpty
          ? null
          : document.getText(selection!);

        currentContext = `Working on: ${filePath} (${fileType})`;
        if (selectedText) {
          currentContext += `\nSelected code: ${selectedText.slice(0, 200)}...`;
        }
      }

      // Analyze intent based on various factors
      const intentAnalysis = analyzeIntent({
        filePath,
        fileType,
        recentMessages,
        contextClues,
        currentContext,
      });

      let output = `🎯 User Intent Analysis:\n\n`;
      output += `**Primary Intent:** ${intentAnalysis.primary}\n`;
      output += `**Confidence:** ${intentAnalysis.confidence.toFixed(1)}/10\n`;

      if (intentAnalysis.category) {
        output += `**Category:** ${intentAnalysis.category}\n`;
      }

      if (intentAnalysis.suggestions.length > 0) {
        output += `\n**Suggested Actions:**\n${intentAnalysis.suggestions
          .map((s) => `• ${s}`)
          .join("\n")}\n`;
      }

      if (intentAnalysis.contextClues.length > 0) {
        output += `\n**Context Clues:**\n${intentAnalysis.contextClues
          .map((c) => `• ${c}`)
          .join("\n")}\n`;
      }

      if (intentAnalysis.recommendedTools.length > 0) {
        output += `\n**Recommended Tools:**\n${intentAnalysis.recommendedTools
          .map((t) => `• ${t}`)
          .join("\n")}\n`;
      }

      return {
        output,
        metadata: {
          ...intentAnalysis,
          filePath,
          fileType,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        output: `❌ Error analyzing user intent: ${errorMessage}`,
        metadata: { error: errorMessage },
      };
    }
  },
});

interface IntentContext {
  filePath: string;
  fileType: string;
  recentMessages: string[];
  contextClues: string[];
  currentContext: string;
}

interface IntentAnalysis {
  primary: string;
  confidence: number;
  category: string;
  suggestions: string[];
  contextClues: string[];
  recommendedTools: string[];
}

function analyzeIntent(context: IntentContext): IntentAnalysis {
  const { filePath, fileType, recentMessages, contextClues, currentContext } =
    context;

  let intent = "General code assistance";
  let confidence = 5.0;
  let category = "General";
  const suggestions: string[] = [];
  const detectedClues: string[] = [];
  const recommendedTools: string[] = [];

  // File type analysis
  if (filePath) {
    detectedClues.push(`Working on ${fileType} file: ${filePath}`);

    // Test file detection
    if (
      filePath.includes(".test.") ||
      filePath.includes(".spec.") ||
      filePath.includes("__tests__")
    ) {
      intent = "Writing or debugging tests";
      category = "Testing";
      confidence = 8.0;
      suggestions.push(
        "Review test coverage",
        "Check related implementation",
        "Validate test assertions"
      );
      recommendedTools.push(
        "discover_related_files to find implementation",
        "read_file to examine test structure"
      );
    }

    // React component detection
    else if (
      (filePath.includes(".tsx") || filePath.includes(".jsx")) &&
      fileType.includes("react")
    ) {
      intent = "Developing React components";
      category = "Frontend Development";
      confidence = 7.5;
      suggestions.push(
        "Check component props",
        "Review state management",
        "Optimize rendering"
      );
      recommendedTools.push(
        "discover_related_files to find related components",
        "analyze_project_context for React patterns"
      );
    }

    // Configuration file detection
    else if (
      filePath.includes("config") ||
      filePath.includes(".json") ||
      filePath.includes(".env")
    ) {
      intent = "Configuring project settings";
      category = "Configuration";
      confidence = 7.0;
      suggestions.push(
        "Validate configuration syntax",
        "Check environment variables",
        "Review dependencies"
      );
      recommendedTools.push(
        "analyze_project_context for configuration overview"
      );
    }

    // API/Server file detection
    else if (
      filePath.includes("api") ||
      filePath.includes("server") ||
      filePath.includes("route")
    ) {
      intent = "Developing backend/API functionality";
      category = "Backend Development";
      confidence = 7.5;
      suggestions.push(
        "Check API endpoints",
        "Validate request/response",
        "Review error handling"
      );
      recommendedTools.push(
        "grep_search for API usage",
        "discover_related_files for related endpoints"
      );
    }
  }

  // Message analysis
  if (recentMessages.length > 0) {
    const combinedMessages = recentMessages.join(" ").toLowerCase();

    // Error/debugging keywords
    if (
      combinedMessages.includes("error") ||
      combinedMessages.includes("bug") ||
      combinedMessages.includes("debug")
    ) {
      intent = "Debugging and fixing errors";
      category = "Debugging";
      confidence = Math.max(confidence, 8.0);
      suggestions.push(
        "Check error logs",
        "Review stack trace",
        "Validate inputs"
      );
      detectedClues.push("Mentioned errors or bugs in conversation");
      recommendedTools.push(
        "grep_search to find error patterns",
        "read_file to examine problematic code"
      );
    }

    // Testing keywords
    else if (
      combinedMessages.includes("test") ||
      combinedMessages.includes("spec") ||
      combinedMessages.includes("coverage")
    ) {
      intent = "Testing and quality assurance";
      category = "Testing";
      confidence = Math.max(confidence, 7.5);
      suggestions.push(
        "Write unit tests",
        "Improve test coverage",
        "Validate edge cases"
      );
      detectedClues.push("Mentioned testing in conversation");
      recommendedTools.push("discover_related_files to find test files");
    }

    // Performance keywords
    else if (
      combinedMessages.includes("performance") ||
      combinedMessages.includes("slow") ||
      combinedMessages.includes("optimize")
    ) {
      intent = "Performance optimization";
      category = "Performance";
      confidence = Math.max(confidence, 7.0);
      suggestions.push(
        "Profile code execution",
        "Optimize algorithms",
        "Check memory usage"
      );
      detectedClues.push("Mentioned performance concerns");
      recommendedTools.push(
        "analyze_project_context for optimization opportunities"
      );
    }

    // Refactoring keywords
    else if (
      combinedMessages.includes("refactor") ||
      combinedMessages.includes("clean") ||
      combinedMessages.includes("improve")
    ) {
      intent = "Code refactoring and improvement";
      category = "Refactoring";
      confidence = Math.max(confidence, 7.0);
      suggestions.push(
        "Extract common patterns",
        "Improve code structure",
        "Reduce duplication"
      );
      detectedClues.push("Mentioned code improvement");
      recommendedTools.push(
        "ast_analysis for code structure",
        "grep_search for duplication patterns"
      );
    }
  }

  // Context clues analysis
  contextClues.forEach((clue) => {
    detectedClues.push(clue);
    if (clue.toLowerCase().includes("new")) {
      suggestions.push("Set up project structure", "Initialize configuration");
    }
  });

  // Default recommendations
  if (recommendedTools.length === 0) {
    recommendedTools.push(
      "get_current_context for file details",
      "analyze_project_context for project overview"
    );
  }

  return {
    primary: intent,
    confidence,
    category,
    suggestions,
    contextClues: detectedClues,
    recommendedTools,
  };
}
