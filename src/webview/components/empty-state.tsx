import { useChatStore } from "@/store/chat";
import { Flex, Kbd, Text } from "@radix-ui/themes";
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
        <table
          style={{
            borderCollapse: "collapse",
            border: "none",
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "4px 12px 4px 0" }}>
                <Kbd size="3">CMD + L + L</Kbd>
              </td>
              <td style={{ padding: "4px 0" }}>
                <Text size="2" style={{ color: "var(--gray-10)" }}>
                  Toggle attach current file
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 12px 4px 0" }}>
                <Kbd size="3">CMD + L + I</Kbd>
              </td>
              <td style={{ padding: "4px 0" }}>
                <Text size="2" style={{ color: "var(--gray-10)" }}>
                  Focus input
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "4px 12px 4px 0" }}>
                <Kbd size="3">CMD + L + P</Kbd>
              </td>
              <td style={{ padding: "4px 0" }}>
                <Text size="2" style={{ color: "var(--gray-10)" }}>
                  Clear chat
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Flex>
    );
  }

  return null;
});
