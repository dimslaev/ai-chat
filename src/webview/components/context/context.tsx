import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import * as React from "react";

import { FileButton } from "@/components/context/file-button";
import { TokenUsage } from "@/components/context/token-usage";
import { useChatActions } from "@/hooks/use-chat-actions";
import { AttachedFile } from "@/lib/types";
import { useChatStore } from "@/store/chat";

type FileEntry = {
  file: AttachedFile;
  selection?: { start: number; end: number };
};

function flattenFiles(files: AttachedFile[]): FileEntry[] {
  const entries: FileEntry[] = [];
  for (const file of files) {
    if (file.selections && file.selections.length > 0) {
      for (const sel of file.selections) {
        entries.push({ file, selection: sel });
      }
    } else {
      entries.push({ file });
    }
  }
  return entries;
}

export const Context: React.FC = React.memo(() => {
  const attachedFiles = useChatStore((state) => state.attachedFiles);
  const suggestedFile = useChatStore((state) => state.suggestedFile);

  const { removeFile, attachFile } = useChatActions();

  const attachedEntries = React.useMemo(
    () => flattenFiles(attachedFiles),
    [attachedFiles],
  );

  const suggestedEntries = React.useMemo(
    () =>
      suggestedFile &&
      !attachedFiles.some((f) => f.filePath === suggestedFile.filePath)
        ? flattenFiles([suggestedFile])
        : [],
    [suggestedFile, attachedFiles],
  );

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
        {attachedEntries.map((entry) => (
          <FileButton
            key={
              entry.selection
                ? `${entry.file.filePath}:${entry.selection.start}-${entry.selection.end}`
                : entry.file.filePath
            }
            file={entry.file}
            selection={entry.selection}
            variant="solid"
            icon={<Cross2Icon style={{ flexShrink: 0 }} />}
            onClick={() =>
              removeFile(
                entry.selection
                  ? {
                      ...entry.file,
                      selections: [entry.selection],
                    }
                  : entry.file,
              )
            }
          />
        ))}

        {suggestedEntries.map((entry) => (
          <FileButton
            key={
              entry.selection
                ? `${entry.file.filePath}:${entry.selection.start}-${entry.selection.end}`
                : entry.file.filePath
            }
            file={entry.file}
            selection={entry.selection}
            variant="soft"
            icon={<PlusIcon style={{ flexShrink: 0 }} />}
            onClick={attachFile}
          />
        ))}
      </Flex>

      {/* <TokenUsage /> */}
    </Flex>
  );
});
