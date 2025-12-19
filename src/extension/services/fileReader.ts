import * as vscode from "vscode";
import { PdfReader } from "pdfreader";
import { OpenAIMessage, AttachedFile } from "@/lib/types";
import { isImageFile, getImageMimeType, isPdfFile } from "@/lib/utils";

function readImageFile(name: string, data: Uint8Array): OpenAIMessage {
  const base64Data = Buffer.from(data).toString("base64");
  const mimeType = getImageMimeType(name);
  return {
    role: "user",
    content: [
      { type: "text", text: `Image: ${name}` },
      {
        type: "image_url",
        image_url: { url: `data:image/${mimeType};base64,${base64Data}` },
      },
    ],
  };
}

async function readPdfFile(
  name: string,
  data: Uint8Array
): Promise<OpenAIMessage> {
  const text = await new Promise<string>((resolve, reject) => {
    const textParts: string[] = [];
    new PdfReader().parseBuffer(
      Buffer.from(data),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any, item: any) => {
        if (err) {
          reject(err);
        } else if (!item) {
          resolve(textParts.join(" "));
        } else if (item.text) {
          textParts.push(item.text);
        }
      }
    );
  });
  return {
    role: "user",
    content: `Context: PDF file ${name}\n${text}`,
  };
}

function readTextFile(file: AttachedFile, data: Uint8Array): OpenAIMessage {
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

  return {
    role: "user",
    content: `Context: Using file ${file.name}\n${fileContent}`,
  };
}

async function readFile(file: AttachedFile): Promise<OpenAIMessage> {
  const data = await vscode.workspace.fs.readFile(file.fileUri);

  if (isImageFile(file.name)) {
    return readImageFile(file.name, data);
  }
  if (isPdfFile(file.name)) {
    return readPdfFile(file.name, data);
  }
  return readTextFile(file, data);
}

export async function readFiles(
  files: AttachedFile[]
): Promise<OpenAIMessage[]> {
  const results = await Promise.allSettled(files.map(readFile));

  return results
    .map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      console.error(`Failed to read file ${files[index].name}:`, result.reason);
      return null;
    })
    .filter((msg): msg is OpenAIMessage => msg !== null);
}
