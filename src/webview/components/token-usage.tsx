import * as React from "react";
import { Flex, Text } from "@radix-ui/themes";
import { useChatStore } from "@/store/chat";

export const TokenUsage: React.FC = () => {
  const tokenUsage = useChatStore((state) => state.tokenUsage);

  const hasTokenUsage = tokenUsage.totalTokens > 0;

  if (!hasTokenUsage) {
    return null;
  }

  return (
    <Flex
      align="center"
      gap="1"
      style={{
        fontSize: "0.75rem",
        color: "var(--gray-11)",
      }}
    >
      <Text>Tokens</Text>
      <Text>In: {tokenUsage.promptTokens}</Text>
      <Text>Out: {tokenUsage.completionTokens}</Text>
    </Flex>
  );
};
