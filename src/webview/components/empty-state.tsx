import { useChatStore } from "@/store/chat";
import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { Flex, Text } from "@radix-ui/themes";
import React from "react";

export const EmptyState: React.FC = React.memo(() => {
  const messages = useChatStore((state) => state.messages);

  const hasMessages = messages.length > 0;

  // Show empty state when no messages exist
  if (!hasMessages) {
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
});
