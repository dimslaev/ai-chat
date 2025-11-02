import * as React from "react";
import { Flex } from "@radix-ui/themes";
import { Messages } from "./messages";
import { TopRow } from "./top-row";
import { InputSection } from "./input-section";
import { Input } from "./input";
import { Settings } from "./settings";
import { useChatSync } from "../hooks";
import { TokenUsage } from "./token-usage";

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
