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
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  const rangeText = selection
    ? `${selection.start + 1}-${selection.end + 1}`
    : null;

  const label = rangeText ? `${file.name} ${rangeText}` : file.name;

  React.useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  });

  const button = (
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
      <TextEllipsis ref={textRef}>{file.name}</TextEllipsis>
      {rangeText && <span style={{ flexShrink: 0 }}>{rangeText}</span>}
    </Button>
  );

  if (isTruncated) {
    return <Tooltip content={label}>{button}</Tooltip>;
  }

  return button;
};
