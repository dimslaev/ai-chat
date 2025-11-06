import * as React from "react";
import { Flex, Text, Button } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/useChatActions";
import { AttachedFile } from "@/lib/types";
import { TokenUsage } from "./token-usage";

export const ContextSection: React.FC = React.memo(() => {
  const attachedFiles = useChatStore((state) => state.attachedFiles);
  const suggestedFile = useChatStore((state) => state.suggestedFile);
  const tokenUsage = useChatStore((state) => state.tokenUsage);

  const { removeFile, attachFile } = useChatActions();

  return (
    <Flex
      direction="row"
      align="center"
      justify="between"
      gap="3"
      px="3"
      py="3"
      style={{
        borderBottom: "1px solid var(--gray-6)",
        background: "var(--color-panel-solid)",
      }}
    >
      <Text
        size="1"
        weight="medium"
        style={{ color: "var(--gray-10)", lineHeight: "22px" }}
      >
        CONTEXT
      </Text>

      <Flex direction="row" align="center" flexGrow="1" wrap="wrap" gap="2">
        {attachedFiles.map((file: AttachedFile) => {
          const displayName = file.selection
            ? `${file.name} ${file.selection.start + 1}-${
                file.selection.end + 1
              }`
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
                ? `${suggestedFile.name} ${suggestedFile.selection.start + 1}-${
                    suggestedFile.selection.end + 1
                  }`
                : suggestedFile.name}
            </Button>
          )}
      </Flex>

      <TokenUsage />
    </Flex>
  );
});
