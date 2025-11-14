import * as React from "react";
import { Flex, IconButton, Tooltip } from "@radix-ui/themes";
import { DownloadIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/useChatActions";

interface ChatActionsProps {}

export const ChatActions: React.FC<ChatActionsProps> = ({}) => {
  const messages = useChatStore((state) => state.messages);
  const { cleanup, saveChat } = useChatActions();
  const hasMessages = messages.length > 0;
  return (
    <Flex
      align="center"
      gap="2"
      style={{
        visibility: hasMessages ? "visible" : "hidden",
      }}
    >
      <Tooltip content="Export chat">
        <IconButton variant="soft" color="gray" size="1" onClick={saveChat}>
          <DownloadIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Clear chat">
        <IconButton variant="soft" color="gray" size="1" onClick={cleanup}>
          <ReloadIcon />
        </IconButton>
      </Tooltip>
    </Flex>
  );
};
