import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { IconButton } from "@radix-ui/themes";
import * as React from "react";

export const CopyButton: React.FC<{
  elRef?: React.RefObject<HTMLElement>;
  text?: string;
}> = ({ elRef, text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const content = text ?? elRef?.current?.textContent ?? "";
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <IconButton size="2" variant="ghost" color="gray" onClick={handleCopy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </IconButton>
  );
};
