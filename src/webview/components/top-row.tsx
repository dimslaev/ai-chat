import * as React from "react";
import { Button, Flex, Badge } from "@radix-ui/themes";
import { useChatStore } from "../store";
import { AttachedFile } from "../../types";
import {
  PlusIcon,
  Cross2Icon,
  DownloadIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

export const TopRow: React.FC = React.memo(() => {
  const messages = useChatStore((state) => state.messages);
  const attachedFiles = useChatStore((state) => state.attachedFiles);
  const suggestedFile = useChatStore((state) => state.suggestedFile);
  const cleanup = useChatStore((state) => state.cleanup);
  const attachFile = useChatStore((state) => state.attachFile);
  const removeFile = useChatStore((state) => state.removeFile);
  const vscode = useChatStore((state) => state.vscode);
  const isStreaming = useChatStore((state) => state.isStreaming);

  const hasMessages = messages.length > 0;

  const handleSaveChat = React.useCallback(() => {
    if (!hasMessages || !vscode) return;

    const markdownContent = messages
      .map((message) => {
        const role = message.role === "user" ? "User" : "Assistant";
        return `## ${role}\n\n${message.content}\n`;
      })
      .join("\n");

    vscode.postMessage({
      type: "saveChat",
      payload: markdownContent,
    });
  }, [messages, hasMessages, vscode]);

  return (
    <Flex
      direction="row"
      align="center"
      justify="between"
      gap="2"
      p="3"
      style={{
        borderBottom: "1px solid var(--gray-6)",
        background: "var(--color-panel-solid)",
      }}
    >
      <Flex
        direction="row"
        align="center"
        gap="2"
        style={{ flex: 1, overflowX: "auto" }}
      >
        {attachedFiles.map((file: AttachedFile) => (
          <Badge
            key={file.fileUri.path}
            variant="solid"
            color="gray"
            style={{ cursor: "pointer" }}
            onClick={() => removeFile(file)}
          >
            <Cross2Icon />
            {file.name}
          </Badge>
        ))}

        {suggestedFile &&
          !attachedFiles.some(
            (file: AttachedFile) =>
              file.fileUri.path === suggestedFile.fileUri.path
          ) && (
            <Button
              variant="outline"
              color="gray"
              size="1"
              onClick={attachFile}
            >
              <PlusIcon />
              {suggestedFile.name}
            </Button>
          )}
      </Flex>
      {hasMessages && (
        <Flex direction="row" align="center" gap="2">
          <Button
            variant="outline"
            color="gray"
            size="1"
            disabled={isStreaming}
            onClick={handleSaveChat}
          >
            <DownloadIcon />
          </Button>

          <Button 
            variant="outline" 
            color="gray" 
            size="1" 
            disabled={isStreaming}
            onClick={cleanup}
          >
            <TrashIcon />
          </Button>
        </Flex>
      )}
    </Flex>
  );
});
