import * as React from "react";
import { Flex } from "@radix-ui/themes";
import { Messages } from "@/components/messages";
import { TopRow } from "@/components/top-row";
import { InputSection } from "@/components/input-section";
import { Input } from "@/components/input";
import { Settings } from "@/components/settings/settings";
import { useChatSync } from "@/hooks/useChatSync";
import { TokenUsage } from "@/components/token-usage";

export const Container: React.FC = () => {
  useChatSync();

  return (
    <Flex
      direction="column"
      style={{
        height: "100vh",
        background: "var(--color-background)",
        color: "var(--color-foreground)",
        position: "relative",
      }}
    >
      <TopRow />
      <Messages />
      <InputSection>
        <Flex align="center" justify="between" gap="2" pt="3" px="3">
          <Settings />
          <TokenUsage />
        </Flex>
        <Input />
      </InputSection>
    </Flex>
  );
};
