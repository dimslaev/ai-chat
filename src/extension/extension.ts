import * as vscode from "vscode";
import { App } from "./modules/app";
import { ProjectAnalyzer } from "./modules/project-analyzer";
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

  // Register project analysis command
  const generateProjectMdCommand = vscode.commands.registerCommand(
    "ai-chat.generateProjectMd",
    async () => {
      try {
        log.info("project analysis command triggered");
        await ProjectAnalyzer.generateAndSave();
        log.info("project analysis command completed successfully");
      } catch (error) {
        log.error("project analysis command failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("ai-chat-view", provider),
    generateProjectMdCommand
  );

  log.info("extension activated successfully");
}

export function deactivate() {
  log.info("extension deactivated");
}
