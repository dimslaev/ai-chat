import * as React from "react";
import { Button, Flex, Badge, Tooltip } from "@radix-ui/themes";
import { useChatStore } from "../store";
import { useChatActions } from "../hooks";
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
  const vscode = useChatStore((state) => state.vscode);
  const isStreaming = useChatStore((state) => state.isStreaming);

  const { cleanup, attachFile, removeFile } = useChatActions();

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
      align="start"
      justify="between"
      gap="2"
      p="3"
      style={{
        borderBottom: "1px solid var(--gray-6)",
        background: "var(--color-panel-solid)",
      }}
    >
      <Flex direction="row" align="center" flexGrow="1" wrap="wrap" gap="2">
        {attachedFiles.map((file: AttachedFile) => {
          const displayName = file.selection
            ? `${file.name} (${file.selection.start + 1}-${
                file.selection.end + 1
              })`
            : file.name;

          return (
            <Button
              key={file.fileUri.path}
              variant="solid"
              color="gray"
              size="1"
              onClick={() => removeFile(file)}
            >
              <Cross2Icon />
              {displayName}
            </Button>
          );
        })}

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
          <Tooltip content="Export chat">
            <Button
              variant="outline"
              color="gray"
              size="1"
              disabled={isStreaming}
              onClick={handleSaveChat}
            >
              <DownloadIcon />
            </Button>
          </Tooltip>

          <Tooltip content="Reset">
            <Button
              variant="outline"
              color="gray"
              size="1"
              disabled={isStreaming}
              onClick={cleanup}
            >
              <TrashIcon />
            </Button>
          </Tooltip>
        </Flex>
      )}
    </Flex>
  );
});
