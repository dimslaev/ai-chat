import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import * as React from "react";

import { FileButton } from "@/components/context/file-button";
import { TokenUsage } from "@/components/context/token-usage";
import { useChatActions } from "@/hooks/use-chat-actions";
import { AttachedFile } from "@/lib/types";
import { useChatStore } from "@/store/chat";

export const Context: React.FC = React.memo(() => {
  const attachedFiles = useChatStore((state) => state.attachedFiles);
  const suggestedFile = useChatStore((state) => state.suggestedFile);

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
      <Flex direction="row" align="center" flexGrow="1" wrap="wrap" gap="2">
        {attachedFiles.map((file: AttachedFile) => (
          <FileButton
            key={file.filePath}
            file={file}
            variant="solid"
            icon={<Cross2Icon style={{ flexShrink: 0 }} />}
            onClick={() => removeFile(file)}
          />
        ))}

        {suggestedFile &&
          !attachedFiles.some(
            (file: AttachedFile) => file.filePath === suggestedFile.filePath,
          ) && (
            <FileButton
              file={suggestedFile}
              variant="soft"
              icon={<PlusIcon style={{ flexShrink: 0 }} />}
              onClick={attachFile}
            />
          )}
      </Flex>

      <TokenUsage />
    </Flex>
  );
});
