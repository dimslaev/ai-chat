import * as vscode from "vscode";

import { State } from "@/extension/core/state";
import { Messages } from "@/extension/handlers/messages";

/**
 * Webview panel setup
 * HTML generation and message listener binding
 */

export function setup(webviewView: vscode.WebviewView): void {
  const webview = webviewView.webview;
  const context = State.context;

  webview.options = {
    enableScripts: true,
    localResourceRoots: [context.extensionUri],
  };

  webview.html = getHtml(webview, context);

  webview.onDidReceiveMessage((data) => {
    Messages.handle(data);
  });

  webviewView.onDidDispose(
    () => {
      State.abort.abort();
    },
    null,
    context.subscriptions,
  );

  State.setWebview(webview);
}

function getHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
): string {
  const webviewUri = vscode.Uri.joinPath(
    context.extensionUri,
    "out",
    "webview.js",
  );
  const scriptUri = webview.asWebviewUri(webviewUri);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Chat</title>
    </head>
    <body>
        <div id="root"></div>
        <script src="${scriptUri.toString()}"></script>
    </body>
    </html>
  `;
}
