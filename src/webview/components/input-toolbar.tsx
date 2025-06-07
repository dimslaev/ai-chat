import * as React from "react";
import { Flex, SegmentedControl } from "@radix-ui/themes";
import { useChatStore } from "../store";

export const InputToolbar: React.FC = React.memo(() => {
  const toolsEnabled = useChatStore((state) => state.toolsEnabled);
  const setToolsEnabled = useChatStore((state) => state.setToolsEnabled);

  const handleValueChange = React.useCallback(
    (value: string) => {
      const enabled = value === "agent";
      setToolsEnabled(enabled);
    },
    [setToolsEnabled]
  );

  return (
    <Flex direction="row" align="center" gap="2" p="3" pb="0">
      <SegmentedControl.Root
        defaultValue={toolsEnabled ? "agent" : "chat"}
        value={toolsEnabled ? "agent" : "chat"}
        size="1"
        onValueChange={handleValueChange}
      >
        <SegmentedControl.Item value="chat">Chat</SegmentedControl.Item>
        <SegmentedControl.Item value="agent">Agent</SegmentedControl.Item>
      </SegmentedControl.Root>
    </Flex>
  );
});
