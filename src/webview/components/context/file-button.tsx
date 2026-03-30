import { Button, Tooltip } from "@radix-ui/themes";
import * as React from "react";

import { TextEllipsis } from "@/components/ui/text-ellipsis";
import { AttachedFile } from "@/lib/types";

interface FileButtonProps {
  file: AttachedFile;
  selection?: { start: number; end: number };
  variant?: "solid" | "soft";
  icon: React.ReactNode;
  onClick: () => void;
}

export const FileButton: React.FC<FileButtonProps> = ({
  file,
  selection,
  variant = "solid",
  icon,
  onClick,
}) => {
  const rangeText = selection
    ? `${selection.start + 1}-${selection.end + 1}`
    : null;

  const label = rangeText ? `${file.name} ${rangeText}` : file.name;

  return (
    <Tooltip content={label}>
      <Button
        variant={variant}
        color="gray"
        size="1"
        onClick={onClick}
        style={{
          justifyItems: "flex-start",
          minWidth: "80px",
          maxWidth: "calc(50% - 4px)",
        }}
      >
        {icon}
        <TextEllipsis>{file.name}</TextEllipsis>
        {rangeText && <span style={{ flexShrink: 0 }}>{rangeText}</span>}
      </Button>
    </Tooltip>
  );
};
