import { CaretRightIcon } from "@radix-ui/react-icons";
import { Box, Flex, Text } from "@radix-ui/themes";
import * as React from "react";

import { Message } from "@/lib/types";

const TOOL_CONFIG: Record<string, { name: string; argKey: string }> = {
  read_file: { name: "read", argKey: "path" },
  list_directory: { name: "list", argKey: "path" },
  search_files: { name: "search", argKey: "query" },
};

interface ToolMessageProps {
  message: Message;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ message }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const config = TOOL_CONFIG[message.toolName || ""] || {
    name: message.toolName,
    argKey: "path",
  };

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
        <Text size="1" color="gray" style={{ width: 42, flexShrink: 0 }}>
          {config.name}
        </Text>
        <Text size="1" color="gray" style={{ opacity: 0.7 }}>
          {displayValue}
        </Text>
      </Flex>
      {isExpanded && message.content && (
        <Box
          mt="2"
          ml="4"
          p="2"
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            background: "var(--gray-a2)",
            borderRadius: "var(--radius-2)",
            maxHeight: 200,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {message.content}
        </Box>
      )}
    </Box>
  );
};
