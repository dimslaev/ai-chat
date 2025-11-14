import * as React from "react";
import { Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/useChatActions";
import { ConfigMenu } from "@/components/config/config-menu";
import { DownloadIcon, ReloadIcon } from "@radix-ui/react-icons";
import { MODELS } from "@/lib/config";

export const Config: React.FC = React.memo(() => {
  const messages = useChatStore((state) => state.messages);
  const configs = useChatStore((state) => state.configs);

  const { cleanup, saveChat } = useChatActions();

  const hasMessages = messages.length > 0;

  const activeConfig = configs.find((it) => it.active);

  return (
    <Flex
      direction="row"
      align="start"
      justify="between"
      gap="3"
      px="3"
      py="3"
      style={{
        borderBottom: "1px solid var(--gray-6)",
        background: "var(--color-panel-solid)",
      }}
    >
      <Flex direction="row" align="center" gap="2" wrap="wrap">
        <ConfigMenu />

        <Flex
          direction="row"
          align="center"
          style={{ color: "var(--gray-10)" }}
          gap="1"
        >
          {activeConfig?.model && (
            <Text size="1" className="config-name">
              {MODELS.find((it) => it.value === activeConfig.model)?.label ||
                activeConfig.model}
            </Text>
          )}
          {activeConfig?.maxCompletionTokens && (
            <>
              <Text size="2">·</Text>
              <Text size="1">Max: {activeConfig.maxCompletionTokens}</Text>
            </>
          )}

          {activeConfig?.temperature && (
            <>
              <Text size="2">·</Text>
              <Text size="1">Temp: {activeConfig.temperature}</Text>
            </>
          )}
        </Flex>
      </Flex>

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
    </Flex>
  );
});
