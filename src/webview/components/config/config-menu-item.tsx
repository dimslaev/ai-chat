import {
  DragHandleDots2Icon,
  MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import { DropdownMenu, Flex, IconButton } from "@radix-ui/themes";
import * as React from "react";

import { Configuration } from "@/lib/types";

interface ConfigMenuItemProps {
  config: Configuration;
  index: number;
  onSelect: (configId: string) => void;
  onEdit: (config: Configuration) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
  dragPosition: "above" | "below" | null;
}

export const ConfigMenuItem: React.FC<ConfigMenuItemProps> = ({
  config,
  index,
  onSelect,
  onEdit,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragOver,
  dragPosition,
}) => {
  return (
    <DropdownMenu.Item
      onClick={() => onSelect(config.id)}
      className="config-menu-item"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(index);
      }}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      style={{
        paddingLeft: "var(--space-2)",
        paddingRight: "var(--space-2)",
        borderTop:
          isDragOver && dragPosition === "above"
            ? "2px solid var(--accent-9)"
            : "2px solid transparent",
        borderBottom:
          isDragOver && dragPosition === "below"
            ? "2px solid var(--accent-9)"
            : "2px solid transparent",
      }}
    >
      <Flex align="center" justify="between" width="100%" gap="2">
        <Flex ml="-1" align="center" gap="2" style={{ minWidth: 0 }}>
          <DragHandleDots2Icon
            style={{ flexShrink: 0, cursor: "grab", opacity: 0.5 }}
          />
          <div className="config-name">{config.name}</div>
        </Flex>
        <Flex gap="2" className="config-actions">
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
