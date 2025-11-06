import * as React from "react";
import { Flex } from "@radix-ui/themes";
import { Messages } from "@/components/messages";
import { TopRow } from "@/components/top-row";
import { ContextSection } from "@/components/context-section";
import { Input } from "@/components/input";
import { useChatSync } from "@/hooks/useChatSync";
import { EmptyState } from "./empty-state";

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
      <ContextSection />
      <EmptyState />
      <Messages />
      <Input />
    </Flex>
  );
};
