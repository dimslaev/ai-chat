import * as React from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge, IconButton, Box, Flex } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

const MAX_HEIGHT = 300;

export const CodeBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const codeRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hasOverflow, setHasOverflow] = React.useState(true);

  const language = React.useMemo(() => {
    if (!className) return null;
    const match = className.match(/language-(\w+)/);
    if (!match) return null;
    const lang = match[1];
    return lang.charAt(0).toUpperCase() + lang.slice(1);
  }, [className]);

  const hasSetOverflow = React.useRef(false);
  React.useLayoutEffect(() => {
    if (contentRef.current && hasSetOverflow.current === false) {
      const contentHeight = contentRef.current.scrollHeight;
      hasSetOverflow.current = true;
      setHasOverflow(contentHeight > MAX_HEIGHT);
    }
  }, [children]);

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

      <Box
        ref={contentRef}
        className={`code-block-content ${
          !isExpanded && hasOverflow ? "code-block-collapsed" : ""
        }`}
        style={{
          maxHeight: !isExpanded && hasOverflow ? `${MAX_HEIGHT}px` : "none",
        }}
      >
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </Box>

      {hasOverflow && (
        <Flex align="center" justify="center" className="code-block-footer">
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {!isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
          </IconButton>
        </Flex>
      )}
    </Box>
  );
};
