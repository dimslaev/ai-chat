import { PdfReader } from "pdfreader";
import * as vscode from "vscode";

import { AttachedFile, FileContentPart } from "@/lib/types";
import { getImageMimeType, isImageFile, isPdfFile } from "@/lib/utils";

/**
 * File attachments reading
 * text with selection ranges, images, and PDF
 */

class FileReaderService {
  async readFilesAsContent(files: AttachedFile[]): Promise<FileContentPart[]> {
    const results = await Promise.allSettled(
      files.map((file) => this.#readFile(file)),
    );

    return results.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      console.error(`Failed to read file ${files[index].name}:`, result.reason);
      return [];
    });
  }

  async #readFile(file: AttachedFile): Promise<FileContentPart[]> {
    const data = await vscode.workspace.fs.readFile(file.fileUri);

    if (isImageFile(file.name)) {
      return this.#readImage(file.name, data);
    }
    if (isPdfFile(file.name)) {
      return this.#readPdf(file.name, data);
    }
    return this.#readText(file, data);
  }

  #readImage(name: string, data: Uint8Array): FileContentPart[] {
    const base64Data = Buffer.from(data).toString("base64");
    const mimeType = getImageMimeType(name);
    return [
      { type: "text", text: `Image: ${name}` },
      {
        type: "image",
        image: `data:image/${mimeType};base64,${base64Data}`,
      },
    ];
  }

  async #readPdf(name: string, data: Uint8Array): Promise<FileContentPart[]> {
    const text = await new Promise<string>((resolve, reject) => {
      const textParts: string[] = [];
      new PdfReader().parseBuffer(Buffer.from(data), (err: any, item: any) => {
        if (err) {
          reject(err);
        } else if (!item) {
          resolve(textParts.join(" "));
        } else if (item.text) {
          textParts.push(item.text);
        }
      });
    });
    return [{ type: "text", text: `Context: PDF file ${name}\n${text}` }];
  }

  #readText(file: AttachedFile, data: Uint8Array): FileContentPart[] {
    const fullContent = Buffer.from(data).toString("utf8");
    let fileContent = fullContent;

    if (file.selections && file.selections.length > 0) {
      const lines = fullContent.split("\n");
      fileContent = file.selections
        .map(({ start, end }) => {
          const selectedLines = lines.slice(start, end + 1);
          return `Lines ${start + 1}-${end + 1}:\n${selectedLines.join("\n")}`;
        })
        .join("\n\n");
    }

    return [
      {
        type: "text",
        text: `Context: Using file ${file.name}\n${fileContent}`,
      },
    ];
  }
}

export const FileReader = new FileReaderService();
