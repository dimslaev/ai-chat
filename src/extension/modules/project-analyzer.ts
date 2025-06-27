import * as vscode from "vscode";
import * as path from "path";
import { App } from "./app";
import { Log } from "./log";
import { getOpenAIToolDefinitions, ALL_TOOLS } from "../tool";
import { generateProjectAnalysisPrompt } from "../prompts/project-analysis";
import { ToolExecutor } from "./tool-executor";
import { writeFileContent } from "../tool/utils";

const log = Log.create({ service: "project-analyzer" });

export namespace ProjectAnalyzer {
  /**
   * Analyze the project comprehensively and generate project.md
   */
  export async function analyze(): Promise<string> {
    const app = App.state();
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceRoot) {
      throw new Error("No workspace folder found");
    }

    log.info("starting project analysis");

    try {
      const analysisPrompt = generateProjectAnalysisPrompt();

      const messages: any[] = [
        {
          role: "system" as const,
          content: analysisPrompt,
        },
        {
          role: "user" as const,
          content: `Analyze this project and generate a comprehensive project.md file.`,
        },
      ];

      log.info("initiating LLM-based project analysis", {
        tools: ALL_TOOLS.length,
        workspaceRoot,
      });

      // Use iterative tool execution
      let iterationCount = 0;
      const maxIterations = 10;

      while (iterationCount < maxIterations) {
        log.info("analysis iteration", {
          count: iterationCount + 1,
          maxIterations,
        });

        const response = await (app.client as any).chat.completions.create({
          model: app.config.MODEL,
          messages: messages as any,
          tools: getOpenAIToolDefinitions(),
          tool_choice: "auto",
          temperature: 0.1,
          max_tokens: 4000,
        });

        const toolCalls = response.choices[0]?.message?.tool_calls;

        if (!toolCalls || toolCalls.length === 0) {
          log.info("analysis complete");

          const finalContent = response.choices[0]?.message?.content;
          if (finalContent) {
            log.info("project analysis completed", {
              iterations: iterationCount + 1,
              contentLength: finalContent.length,
            });
            return finalContent;
          } else {
            throw new Error("No content generated in final response");
          }
        }

        log.info("executing tool calls", {
          count: toolCalls.length,
          tools: toolCalls.map((t: any) => t.function.name),
        });

        // Execute tools
        const toolExecutor = new ToolExecutor();
        toolExecutor.setWorkspaceRoot(workspaceRoot);

        const toolResults = await Promise.all(
          toolCalls.map(async (toolCall: any) => {
            try {
              const result = await toolExecutor.executeToolCall(
                toolCall.id,
                toolCall.function.name,
                JSON.parse(toolCall.function.arguments),
                app.abort.signal
              );
              return result;
            } catch (error) {
              log.error("tool execution failed", {
                tool: toolCall.function.name,
                error: error instanceof Error ? error.message : String(error),
              });
              return {
                tool_call_id: toolCall.id,
                content: `Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              };
            }
          })
        );

        // Add messages to conversation
        messages.push({
          role: "assistant" as const,
          content: response.choices[0]?.message?.content || null,
          tool_calls: toolCalls,
        });

        for (const result of toolResults) {
          messages.push({
            role: "tool" as const,
            tool_call_id: result.tool_call_id,
            content: result.content,
          });
        }

        iterationCount++;

        if (app.abort.signal.aborted) {
          log.info("analysis aborted");
          throw new Error("Analysis was aborted");
        }
      }

      if (iterationCount >= maxIterations) {
        log.warn("reached maximum iterations", { maxIterations });
        throw new Error("Analysis reached maximum iterations");
      }

      throw new Error("Analysis completed without generating content");
    } catch (error) {
      log.error("project analysis failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate and save project.md file
   */
  export async function generateAndSave(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceRoot) {
      throw new Error("No workspace folder found");
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing Project",
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({ increment: 0, message: "Starting analysis..." });

          const app = App.state();
          const originalAbort = app.abort;
          app.abort = new AbortController();

          token.onCancellationRequested(() => {
            app.abort.abort();
          });

          try {
            progress.report({
              increment: 20,
              message: "Analyzing codebase...",
            });

            const analysisContent = await analyze();

            progress.report({
              increment: 80,
              message: "Writing project.md...",
            });

            await writeFileContent(
              "project.md",
              analysisContent,
              workspaceRoot
            );

            progress.report({ increment: 100, message: "Complete!" });

            app.abort = originalAbort;

            const selection = await vscode.window.showInformationMessage(
              "✅ project.md generated successfully!",
              "Open File"
            );

            if (selection === "Open File") {
              const projectMdPath = vscode.Uri.file(
                path.join(workspaceRoot, "project.md")
              );
              await vscode.window.showTextDocument(projectMdPath);
            }
          } catch (error) {
            app.abort = originalAbort;
            throw error;
          }
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to generate project.md: ${errorMessage}`
      );
      throw error;
    }
  }
}
