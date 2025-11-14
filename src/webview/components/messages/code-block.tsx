import * as React from "react";
import { CopyButton } from "@/components/ui/copy-button";

export const CodeBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const codeRef = React.useRef<HTMLElement>(null);
  return (
    <div style={{ position: "relative" }}>
      <CopyButton elRef={codeRef} />
      <code ref={codeRef} className={className}>
        {children}
      </code>
    </div>
  );
};
