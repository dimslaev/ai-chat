import React from "react";
import { Flex } from "@radix-ui/themes";
import { useChatStore } from "@/store/chat";
import { ShortcutRow } from "@/components/ui/shortcut-row";

export const EmptyState: React.FC = React.memo(() => {
  const messages = useChatStore((state) => state.messages);

  if (messages.length === 0) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="4"
        style={{
          flexGrow: 1,
          padding: "48px 24px",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            border: "none",
          }}
        >
          <tbody>
            <ShortcutRow keys="CMD + K + K" description="Attach current file" />
            <ShortcutRow keys="CMD + K + O" description="Change config" />
            <ShortcutRow
              keys="CMD + K + I"
              description="Open chat / Focus input"
            />
          </tbody>
        </table>
      </Flex>
    );
  }

  return null;
});
