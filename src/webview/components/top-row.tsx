import * as React from "react";
import {
  Button,
  Flex,
  IconButton,
  Kbd,
  DropdownMenu,
  Dialog,
  Text,
  Table,
} from "@radix-ui/themes";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/useChatActions";
import { AttachedFile } from "@/lib/types";
import {
  PlusIcon,
  Cross2Icon,
  DownloadIcon,
  TrashIcon,
  DotsVerticalIcon,
  KeyboardIcon,
} from "@radix-ui/react-icons";

const KeyBindingsDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Keyboard Shortcuts</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Available keyboard shortcuts for AI Chat
        </Dialog.Description>

        <Table.Root variant="surface">
          <Table.Body>
            <Table.Row>
              <Table.Cell>
                <Text size="2">Toggle file attachment</Text>
              </Table.Cell>
              <Table.Cell align="right">
                <Kbd>⌘ K</Kbd>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export const TopRow: React.FC = React.memo(() => {
  const messages = useChatStore((state) => state.messages);
  const attachedFiles = useChatStore((state) => state.attachedFiles);
  const suggestedFile = useChatStore((state) => state.suggestedFile);
  const isStreaming = useChatStore((state) => state.isStreaming);

  const { cleanup, clearFiles, attachFile, removeFile, saveChat } =
    useChatActions();

  const [keyBindingsOpen, setKeyBindingsOpen] = React.useState(false);

  const hasMessages = messages.length > 0;
  const hasFiles = attachedFiles.length > 0;
  const showExportChat = hasMessages;
  const showClearChat = hasMessages;
  const showClearFiles = hasFiles;

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
              {suggestedFile.selection
                ? `${suggestedFile.name} (${
                    suggestedFile.selection.start + 1
                  }-${suggestedFile.selection.end + 1})`
                : suggestedFile.name}
            </Button>
          )}
      </Flex>

      <Flex align="center" gap="2" pt="1">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton
              variant="ghost"
              color="gray"
              size="3"
              radius="full"
              disabled={isStreaming}
            >
              <DotsVerticalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="2" variant="soft" color="gray">
            {showExportChat && (
              <DropdownMenu.Item onClick={saveChat}>
                <DownloadIcon />
                Export chat
              </DropdownMenu.Item>
            )}
            {showClearChat && (
              <DropdownMenu.Item onClick={cleanup}>
                <TrashIcon />
                Clear chat
              </DropdownMenu.Item>
            )}
            {showClearFiles && (
              <DropdownMenu.Item onClick={clearFiles}>
                <Cross2Icon />
                Clear files
              </DropdownMenu.Item>
            )}
            {(showExportChat || showClearChat || showClearFiles) && (
              <DropdownMenu.Separator />
            )}
            <DropdownMenu.Item onClick={() => setKeyBindingsOpen(true)}>
              <KeyboardIcon />
              Keyboard shortcuts
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <KeyBindingsDialog
          open={keyBindingsOpen}
          onOpenChange={setKeyBindingsOpen}
        />
      </Flex>
    </Flex>
  );
});
