import * as React from "react";
import { Box, ScrollArea, Callout, Spinner, Flex } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Message } from "./message";
import { useChatStore } from "../store";
import { Message as MessageType } from "../../types";
// import { simulateStreamingResponse } from "./mockresponse";

export const Messages: React.FC = () => {
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const apiError = useChatStore((state) => state.apiError);

  const messagesRef = React.useRef<HTMLDivElement>(null);

  // React.useEffect(() => {
  //   const { addMessage, setIsStreaming, appendToLastMessage } =
  //     useChatStore.getState();

  //   simulateStreamingResponse({
  //     addMessage,
  //     setIsStreaming,
  //     appendToLastMessage,
  //   });
  // }, []);

  // Auto-scroll when streaming ends
  React.useEffect(() => {
    if (!isStreaming && messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [isStreaming]);

  return (
    <ScrollArea
      ref={messagesRef}
      style={{
        flex: 1,
        paddingBottom: "16px",
      }}
    >
      <Box
        p="4"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {messages.map((message: MessageType, index: number) => (
          <Message
            key={message.id}
            message={message}
            isStreaming={isStreaming}
            isLast={index === messages.length - 1}
          />
        ))}

        {apiError && (
          <Callout.Root color="red" variant="soft">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              Sorry, there's been a server error.
              {apiError.code && <Box mt="1">Code: {apiError.code}</Box>}
              {apiError.message && <Box mt="1">{apiError.message}</Box>}
            </Callout.Text>
          </Callout.Root>
        )}

        {isStreaming && messages[messages.length - 1].role !== "assistant" && (
          <Flex justify="center" p="3">
            <Spinner size="2" />
          </Flex>
        )}
      </Box>
    </ScrollArea>
  );
};
