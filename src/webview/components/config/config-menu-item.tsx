import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { DropdownMenu, Flex, IconButton } from "@radix-ui/themes";
import * as React from "react";

import { Configuration } from "@/lib/types";

interface ConfigMenuItemProps {
  config: Configuration;
  onSelect: (configId: string) => void;
  onEdit: (config: Configuration) => void;
}

export const ConfigMenuItem: React.FC<ConfigMenuItemProps> = ({
  config,
  onSelect,
  onEdit,
}) => {
  return (
    <DropdownMenu.Item
      onClick={() => onSelect(config.id)}
      className="config-menu-item"
    >
      <Flex align="center" justify="between" width="100%" gap="2">
        <div className="config-name">{config.name}</div>
        <Flex mr="-1" gap="2" className="config-actions">
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            radius="full"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(config);
            }}
            aria-label="Edit config"
          >
            <MixerHorizontalIcon />
          </IconButton>
        </Flex>
      </Flex>
    </DropdownMenu.Item>
  );
};
