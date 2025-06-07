import * as React from "react";
import { Box, ScrollArea, Callout, Spinner, Flex } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Message } from "./message";
import { useChatStore } from "../store";
import { Message as MessageType } from "../../types";

export const Messages: React.FC = () => {
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const isLoading = useChatStore((state) => state.isLoading);
  const toolsEnabled = useChatStore((state) => state.toolsEnabled);
  const shouldAutoScroll = useChatStore((state) => state.shouldAutoScroll);
  const setShouldAutoScroll = useChatStore(
    (state) => state.setShouldAutoScroll
  );
  const apiError = useChatStore((state) => state.apiError);

  const messagesRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (shouldAutoScroll && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll]);

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (event.deltaY < 0 && shouldAutoScroll) {
        // User scrolled up
        setShouldAutoScroll(false);
      } else if (event.deltaY > 0 && messagesRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
        if (isNearBottom && !shouldAutoScroll) {
          // User scrolled down to the bottom
          setShouldAutoScroll(true);
        }
      }
    },
    [setShouldAutoScroll, shouldAutoScroll]
  );

  const showSpinner = toolsEnabled && isLoading;

  return (
    <ScrollArea
      ref={messagesRef}
      onWheel={handleWheel}
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

        {showSpinner && (
          <Flex justify="center" p="3">
            <Spinner size="2" />
          </Flex>
        )}
      </Box>
    </ScrollArea>
  );
};
