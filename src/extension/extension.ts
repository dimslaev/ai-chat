import * as vscode from "vscode";
import { App } from "./modules/app";
import { ContextGatherer } from "./modules/context-gatherer";
import { Webview } from "./modules/webview";
import { Log } from "./modules/log";

const log = Log.create({ service: "extension" });

export function activate(context: vscode.ExtensionContext) {
  log.info("activating extension", {
    version: context.extension.packageJSON.version,
  });

  // Register webview provider
  const provider = {
    resolveWebviewView: (webviewView: vscode.WebviewView) => {
      // Initialize app context and setup webview
      App.provide(context, webviewView.webview, async () => {
        Webview.setup(webviewView);

        // Register event listeners
        const disposables = [
          App.onConfigurationChanged(),
          Webview.onActiveFileChanged(),
        ];

        context.subscriptions.push(...disposables);

        log.info("extension fully initialized");

        // Keep the context alive until webview is disposed
        return new Promise<void>((resolve) => {
          webviewView.onDidDispose(resolve);
        });
      }).catch((error) => {
        log.error("failed to initialize app", { error: error.message });
      });
    },
  };

  // Register commands for context gathering
  const gatherContextCommand = vscode.commands.registerCommand(
    "ai-chat.gatherContext",
    async () => {
      try {
        const context = await ContextGatherer.gather();
        const summary = ContextGatherer.formatSummary(context);

        vscode.window
          .showInformationMessage(
            `Context gathered: ${summary}`,
            "Show Details"
          )
          .then((selection) => {
            if (selection === "Show Details") {
              const panel = vscode.window.createWebviewPanel(
                "contextDetails",
                "Context Details",
                vscode.ViewColumn.One,
                {}
              );

              panel.webview.html = `
              <html>
                <body>
                  <h1>Context Gathering Results</h1>
                  <h2>Summary</h2>
                  <p>${summary}</p>
                  
                  <h2>Current File</h2>
                  <pre>${
                    context.currentFile
                      ? JSON.stringify(context.currentFile, null, 2)
                      : "No current file"
                  }</pre>
                  
                  <h2>Related Files (${context.relatedFiles.length})</h2>
                  <ul>
                    ${context.relatedFiles
                      .map(
                        (file) =>
                          `<li><strong>${file.path}</strong> (${file.relationship})</li>`
                      )
                      .join("")}
                  </ul>
                  
                  <h2>Project Structure</h2>
                  <pre>${context.projectStructure || "Not available"}</pre>
                  
                  <h2>Detected Patterns</h2>
                  <pre>${JSON.stringify(context.patterns, null, 2)}</pre>
                  
                  <h2>Inferred Intent</h2>
                  <pre>${context.intent || "Not determined"}</pre>
                </body>
              </html>
            `;
            }
          });
      } catch (error) {
        vscode.window.showErrorMessage(`Context gathering failed: ${error}`);
      }
    }
  );

  const generateProjectMdCommand = vscode.commands.registerCommand(
    "ai-chat.generateProjectMd",
    async () => {
      try {
        const context = await ContextGatherer.gather();

        const workspaceRoot =
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
          vscode.window.showErrorMessage("No workspace folder found");
          return;
        }

        const projectMdContent = generateProjectMdContent(context);
        const projectMdPath = vscode.Uri.file(`${workspaceRoot}/project.md`);

        await vscode.workspace.fs.writeFile(
          projectMdPath,
          Buffer.from(projectMdContent, "utf8")
        );

        vscode.window
          .showInformationMessage(
            "project.md generated successfully!",
            "Open File"
          )
          .then((selection) => {
            if (selection === "Open File") {
              vscode.window.showTextDocument(projectMdPath);
            }
          });
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate project.md: ${error}`
        );
      }
    }
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("ai-chat-view", provider),
    gatherContextCommand,
    generateProjectMdCommand
  );

  log.info("extension activated successfully");
}

// @TODO evaluate if this is necessary as vscode command
// or if it's done somewhere in chat/completion.ts.
// if not keep it and remove todo comment.
function generateProjectMdContent(
  context: import("./modules/context-gatherer").GatheredContext
): string {
  const timestamp = new Date().toISOString();

  return `# Project Overview

*Generated on ${timestamp}*

## Current Context

${
  context.currentFile
    ? `**Current File:** \`${context.currentFile.path}\`\n**Language:** ${context.currentFile.language}`
    : "No current file open"
}

${context.intent ? `**Inferred Intent:** ${context.intent}` : ""}

## Project Structure

${context.projectStructure || "Project structure not available"}

## Detected Patterns

${
  context.patterns.length > 0
    ? context.patterns.map((pattern) => `- ${pattern}`).join("\n")
    : "No patterns detected"
}

## Related Files (${context.relatedFiles.length})

${
  context.relatedFiles.length > 0
    ? context.relatedFiles
        .map((file) => `- **${file.path}** (${file.relationship})`)
        .join("\n")
    : "No related files found"
}

---

*This file was auto-generated by the AI Chat extension's context gathering system.*
`;
}
