import * as vscode from "vscode";
import { Log } from "./util/log";
import { App } from "./app/app";
import { Webview } from "./ui/webview";

const log = Log.create({ service: "extension" });

export function activate(context: vscode.ExtensionContext) {
  log.info("activating extension", {
    version: context.extension.packageJSON.version,
  });

  // Register webview provider
  const provider = {
    resolveWebviewView: (webviewView: vscode.WebviewView) => {
      // Initialize app context and setup webview
      App.provide(context, webviewView.webview, async (info) => {
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

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("ai-chat-view", provider)
  );

  log.info("extension activated successfully");
}
