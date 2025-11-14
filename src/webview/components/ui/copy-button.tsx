import * as React from "react";
import { IconButton } from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";

export const CopyButton: React.FC<{ elRef: React.RefObject<HTMLElement> }> = ({
  elRef,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(elRef.current?.textContent ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <IconButton
      size="2"
      variant="soft"
      color="gray"
      className="action-button copy-button"
      onClick={handleCopy}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </IconButton>
  );
};
