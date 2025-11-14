import * as React from "react";
import { Button } from "@radix-ui/themes";
import { AttachedFile } from "@/lib/types";
import { TextEllipsis } from "@/components/ui/text-ellipsis";

interface FileButtonProps {
  file: AttachedFile;
  variant?: "solid" | "soft";
  icon: React.ReactNode;
  onClick: () => void;
}

export const FileButton: React.FC<FileButtonProps> = ({
  file,
  variant = "solid",
  icon,
  onClick,
}) => {
  const displayName = file.selection
    ? `${file.name} ${file.selection.start + 1}-${file.selection.end + 1}`
    : file.name;

  return (
    <Button
      variant={variant}
      color="gray"
      size="1"
      onClick={onClick}
      style={{ justifyItems: "flex-start" }}
    >
      {icon}
      <TextEllipsis maxWidth="160px">{displayName}</TextEllipsis>
    </Button>
  );
};
