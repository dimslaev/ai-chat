import * as React from "react";
import { Flex, IconButton, Tooltip } from "@radix-ui/themes";
import {
  DownloadIcon,
  ReloadIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/useChatActions";

export const ChatActions: React.FC = () => {
  const messages = useChatStore((state) => state.messages);
  const { cleanup, saveChat, agentMode, toggleAgentMode } = useChatActions();

  const hasMessages = messages.length > 0;

  return (
    <Flex align="center" gap="2">
      <Tooltip content={agentMode ? "Tools enabled" : "Tools disabled"}>
        <IconButton
          variant={agentMode ? "solid" : "soft"}
          color="gray"
          size="1"
          onClick={toggleAgentMode}
        >
          <LightningBoltIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Export chat">
        <IconButton
          variant="soft"
          color="gray"
          size="1"
          onClick={saveChat}
          disabled={!hasMessages}
        >
          <DownloadIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Clear chat">
        <IconButton
          variant="soft"
          color="gray"
          size="1"
          onClick={cleanup}
          disabled={!hasMessages}
        >
          <ReloadIcon />
        </IconButton>
      </Tooltip>
    </Flex>
  );
};
