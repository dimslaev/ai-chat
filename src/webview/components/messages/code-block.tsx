import * as React from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge, Box, Flex } from "@radix-ui/themes";

export const CodeBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const codeRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const language = React.useMemo(() => {
    if (!className) return null;
    const match = className.match(/language-(\w+)/);
    if (!match) return null;
    const lang = match[1];
    return lang.charAt(0).toUpperCase() + lang.slice(1);
  }, [className]);

  return (
    <Box className="code-block-container">
      <Flex align="center" justify="between" className="code-block-header">
        <Flex align="center" gap="2">
          {language && (
            <Badge
              size="1"
              variant="soft"
              color="gray"
              className="code-language-badge"
            >
              {language}
            </Badge>
          )}
        </Flex>
        <CopyButton elRef={codeRef} />
      </Flex>

      <Box ref={contentRef} className="code-block-content">
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </Box>
    </Box>
  );
};
