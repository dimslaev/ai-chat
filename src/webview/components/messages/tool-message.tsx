import { CaretRightIcon } from "@radix-ui/react-icons";
import { Box, Flex, Text } from "@radix-ui/themes";
import * as React from "react";

import { MCP_TOOLS } from "@/lib/config";
import { Message } from "@/lib/types";

type ToolConfig = {
  name: string;
  argKey: string;
};

const TOOL_CONFIG: Record<string, ToolConfig> = Object.fromEntries(
  MCP_TOOLS.map((t) => [t.id, { name: t.shortName, argKey: t.argKey }]),
);

interface ToolMessageProps {
  message: Message;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ message }) => {
  const config = TOOL_CONFIG[message.toolName || ""] || {
    name: message.toolName,
    argKey: "path",
  };
  const [isExpanded, setIsExpanded] = React.useState(false);

  const args = React.useMemo(() => {
    if (!message.toolArgs) return null;
    try {
      return JSON.parse(message.toolArgs);
    } catch {
      return null;
    }
  }, [message.toolArgs]);

  const displayValue = args?.[config.argKey] || args?.path || "";

  return (
    <Box>
      <Flex
        align="center"
        gap="2"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: "pointer" }}
      >
        <Text
          color="gray"
          size="1"
          style={{
            display: "inline-flex",
            flexShrink: 0,
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <CaretRightIcon />
        </Text>
        <Text
          size="1"
          color="gray"
          style={{
            width: displayValue ? 80 : undefined,
            flexShrink: 0,
          }}
        >
          {config.name}
        </Text>
        {displayValue && (
          <Text size="1" color="gray" style={{ opacity: 0.7 }}>
            {displayValue}
          </Text>
        )}
      </Flex>
      {isExpanded && message.content && (
        <Box
          mt="2"
          ml="4"
          p="2"
          style={{
            fontSize: "12px",
            fontFamily:
              config.name === "think" ? undefined : "var(--font-mono)",
            color: "var(--gray-11)",
            maxHeight: 200,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: config.name === "think" ? undefined : "break-all",
          }}
        >
          {message.content}
        </Box>
      )}
    </Box>
  );
};
