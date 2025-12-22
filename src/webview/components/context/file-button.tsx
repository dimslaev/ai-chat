import { Button } from "@radix-ui/themes";
import * as React from "react";

import { TextEllipsis } from "@/components/ui/text-ellipsis";
import { AttachedFile } from "@/lib/types";

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
  const { fileName, rangeText } = React.useMemo(() => {
    if (!file.selections || file.selections.length === 0) {
      return { fileName: file.name, rangeText: null };
    }

    const firstRange = `${file.selections[0].start + 1}-${
      file.selections[0].end + 1
    }`;
    const hasMore = file.selections.length > 2;
    const rangeDisplay = hasMore
      ? `${firstRange}+`
      : file.selections
          .map((sel) => `${sel.start + 1}-${sel.end + 1}`)
          .join(",");

    return { fileName: file.name, rangeText: rangeDisplay };
  }, [file.name, file.selections]);

  return (
    <Button
      variant={variant}
      color="gray"
      size="1"
      onClick={onClick}
      style={{ justifyItems: "flex-start", maxWidth: "200px" }}
    >
      {icon}
      <TextEllipsis>{fileName}</TextEllipsis>
      {rangeText && <span style={{ flexShrink: 0 }}>{rangeText}</span>}
    </Button>
  );
};
