import { useChatStore } from "@/store/chat";
import { Flex, Text } from "@radix-ui/themes";
import React from "react";

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
        <Flex direction="column" gap="1" align="center">
          {/* <Text size="2" style={{ color: "var(--gray-10)" }}>
            ⌘⇧A — Toggle attach current file
          </Text> */}
          <Text size="2" style={{ color: "var(--gray-10)" }}>
            ⌘K — Toggle attach currently opened file
          </Text>
          {/* <Text size="2" style={{ color: "var(--gray-10)" }}>
            ⌘L — Focus input
          </Text> */}
        </Flex>
      </Flex>
    );
  }

  return null;
});
