import * as React from "react";
import { Button, Flex, Badge, Tooltip, IconButton } from "@radix-ui/themes";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/useChatActions";
import { AttachedFile } from "@/lib/types";
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
  const isStreaming = useChatStore((state) => state.isStreaming);

  const { cleanup, attachFile, removeFile, saveChat } = useChatActions();

  const hasMessages = messages.length > 0;

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
            <Button variant="soft" color="gray" size="1" onClick={attachFile}>
              <PlusIcon />
              {suggestedFile.name}
            </Button>
          )}
      </Flex>

      <Flex
        align="center"
        gap="4"
        pt="1"
        style={
          !hasMessages
            ? { visibility: "hidden", pointerEvents: "none" }
            : undefined
        }
      >
        <Tooltip content="Export chat">
          <IconButton
            variant="ghost"
            color="gray"
            size="3"
            radius="full"
            disabled={isStreaming}
            onClick={saveChat}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>

        <Tooltip content="Reset">
          <IconButton
            variant="ghost"
            color="gray"
            size="3"
            radius="full"
            disabled={isStreaming}
            onClick={cleanup}
          >
            <TrashIcon />
          </IconButton>
        </Tooltip>
      </Flex>
    </Flex>
  );
});
