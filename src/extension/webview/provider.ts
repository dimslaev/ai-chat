import * as vscode from "vscode";
import * as State from "@/extension/core/state";
import { handleMessage } from "@/extension/handlers/messages";

export function setup(webviewView: vscode.WebviewView): void {
  const webview = webviewView.webview;
  const context = State.get.context;

  webview.options = {
    enableScripts: true,
    localResourceRoots: [context.extensionUri],
  };

  webview.html = getHtml(webview, context);

  webview.onDidReceiveMessage((data) => {
    handleMessage(data);
  });

  webviewView.onDidDispose(
    () => {
      State.get.abort.abort();
    },
    null,
    context.subscriptions
  );

  State.setWebview(webview);
}

function getHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): string {
  const webviewUri = vscode.Uri.joinPath(
    context.extensionUri,
    "out",
    "webview.js"
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
