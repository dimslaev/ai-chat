import { generateText } from "ai";
import * as vscode from "vscode";

import { createModel } from "@/extension/core/providers";
import { State } from "@/extension/core/state";
import { cleanExportConfig } from "@/lib/schema";
import { Configuration } from "@/lib/types";
import { sanitizeFilename } from "@/lib/utils";

/**
 * File export
 * chat, config, title generation
 */

class FileWriterService {
  async exportChat(
    markdownContent: string,
    onError: (error: unknown) => void,
  ): Promise<void> {
    try {
      const title = await this.generateChatTitle();
      const fileName = `${title}.md`;
      await this.#saveFileToWorkspace(fileName, markdownContent, "md");
    } catch (error) {
      console.error("Failed to save chat:", error);
      onError(error);
    }
  }

  async exportConfig(
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
      await this.#saveFileToWorkspace(fileName, jsonContent, "json");
    } catch (error) {
      console.error("Failed to export config:", error);
      onError(error);
    }
  }

  async generateChatTitle(): Promise<string> {
    try {
      if (State.history.length === 0) {
        return "empty_chat";
      }

      const contextMessages = State.history
        .slice(0, 3)
        .map((msg) => `${msg.role}: ${msg.content.slice(0, 200)}`)
        .join("\n");

      const { config } = State;
      const model = createModel(config);

      const response = await generateText({
        model,
        messages: [
          {
            role: "system",
            content:
              "Generate a 5 word or less snake_case title that summarizes this chat conversation. Use only lowercase letters, numbers, and underscores. Be concise and descriptive.",
          },
          {
            role: "user",
            content: `Summarize this chat in 5 words or less using snake_case:\n\n${contextMessages}`,
          },
        ],
        temperature: 0.3,
        maxOutputTokens: 20,
      });

      const title = response.text?.trim() || "chat_summary";
      return sanitizeFilename(title) || "chat_summary";
    } catch (error) {
      console.error("Failed to generate chat title:", error);
      return `chat_${Date.now().toString().slice(-6)}`;
    }
  }

  async #saveFileToWorkspace(
    fileName: string,
    content: string,
    fileType: string,
  ): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(content, "utf8"),
      );

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
}

export const FileWriter = new FileWriterService();
