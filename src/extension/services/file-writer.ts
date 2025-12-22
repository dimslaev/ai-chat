import * as vscode from "vscode";

import { generateChatTitle } from "@/extension/services/title-generator";
import { cleanExportConfig } from "@/lib/schema";
import { Configuration } from "@/lib/types";
import { sanitizeFilename } from "@/lib/utils";

async function saveFileToWorkspace(
  fileName: string,
  content: string,
  fileType: string,
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (workspaceFolder) {
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, "utf8"));

    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document);
  } else {
    const filters: Record<string, string[]> = {};
    const filterLabel =
      fileType === "md"
        ? "Markdown Files"
        : fileType === "json"
          ? "JSON Files"
          : "All Files";
    filters[filterLabel] = [fileType];

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(fileName),
      filters,
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(
        saveUri,
        Buffer.from(content, "utf8"),
      );

      const document = await vscode.workspace.openTextDocument(saveUri);
      await vscode.window.showTextDocument(document);
    }
  }
}

export async function saveChatToFile(
  markdownContent: string,
  onError: (error: unknown) => void,
): Promise<void> {
  try {
    const title = await generateChatTitle();
    const fileName = `${title}.md`;
    await saveFileToWorkspace(fileName, markdownContent, "md");
  } catch (error) {
    console.error("Failed to save chat:", error);
    onError(error);
  }
}

export async function exportConfigToFile(
  config: Configuration,
  onError: (error: unknown) => void,
): Promise<void> {
  try {
    const cleanedConfig = cleanExportConfig(config);
    const baseFileName = cleanedConfig.name
      ? sanitizeFilename(cleanedConfig.name)
      : "config";
    const fileName = `${baseFileName}.json`;
    const jsonContent = JSON.stringify(cleanedConfig, null, 2);
    await saveFileToWorkspace(fileName, jsonContent, "json");
  } catch (error) {
    console.error("Failed to export config:", error);
    onError(error);
  }
}
