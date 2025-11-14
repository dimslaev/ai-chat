import * as React from "react";
import { Flex } from "@radix-ui/themes";
import { useChatStore } from "@/store/chat";
import { ConfigMenu, ConfigMenuRef } from "@/components/config/config-menu";
import { ConfigInfo } from "@/components/config/config-info";
import { ChatActions } from "@/components/config/chat-actions";

export interface ConfigRef {
  openConfigMenu: () => void;
}

interface ConfigProps {
  onConfigSelected?: () => void;
}

export const Config = React.forwardRef<ConfigRef, ConfigProps>(
  ({ onConfigSelected }, ref) => {
    const configMenuRef = React.useRef<ConfigMenuRef>(null);
    const configs = useChatStore((state) => state.configs);

    React.useImperativeHandle(ref, () => ({
      openConfigMenu: () => configMenuRef.current?.openDropdown(),
    }));

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
          <ConfigMenu ref={configMenuRef} onConfigSelected={onConfigSelected} />
          <ConfigInfo config={activeConfig} />
        </Flex>

        <ChatActions />
      </Flex>
    );
  }
);

Config.displayName = "Config";
