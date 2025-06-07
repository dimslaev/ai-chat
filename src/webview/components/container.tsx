import * as React from "react";
import { Flex } from "@radix-ui/themes";
import { Messages } from "./messages";
import { TopRow } from "./top-row";
import { InputSection } from "./input-section";
import { Input } from "./input";
import { InputToolbar } from "./input-toolbar";

export const Container: React.FC = () => {
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
        <InputToolbar />
        <Input />
      </InputSection>
    </Flex>
  );
};
