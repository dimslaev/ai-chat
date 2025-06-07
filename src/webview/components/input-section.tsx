import * as React from "react";
import { Flex } from "@radix-ui/themes";

interface InputSectionProps {
  children: React.ReactNode;
}

export const InputSection: React.FC<InputSectionProps> = ({ children }) => {
  return (
    <Flex
      direction="column"
      style={{
        borderTop: "1px solid var(--gray-6)",
        background: "var(--color-panel-solid)",
      }}
    >
      {children}
    </Flex>
  );
};
