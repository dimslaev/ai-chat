import { Flex, Text } from "@radix-ui/themes";
import * as React from "react";

import { useChatStore } from "@/store/chat";

export const TokenUsage: React.FC = () => {
  const tokenUsage = useChatStore((state) => state.tokenUsage);

  return (
    <Flex align="center" gap="1" style={{ color: "var(--gray-10)" }}>
      <Text size="1" style={{ whiteSpace: "nowrap" }}>
        In: {tokenUsage.promptTokens}
      </Text>
      <Text size="2">·</Text>
      <Text size="1" style={{ whiteSpace: "nowrap" }}>
        Out: {tokenUsage.completionTokens}
      </Text>
    </Flex>
  );
};
