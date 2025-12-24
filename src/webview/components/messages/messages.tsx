import { ArrowDownIcon,ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Box, Callout, Flex, IconButton,Spinner } from "@radix-ui/themes";
import * as React from "react";

import { Message } from "@/components/messages/message";
import { Message as MessageType } from "@/lib/types";
import { waitFrames } from "@/lib/utils";
import { useChatStore } from "@/store/chat";

export const Messages: React.FC = () => {
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const apiError = useChatStore((state) => state.apiError);

  const messagesRef = React.useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const previousMessageCountRef = React.useRef(messages.length);

  const [isReady, setIsReady] = React.useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: behavior,
      });
    }
  };

  // Scroll to bottom on initial load
  React.useEffect(() => {
    waitFrames(() => {
      scrollToBottom("auto");
      setIsReady(true);
    }, 3);
  }, []);

  // Scroll to bottom when user sends a new message
  const isNewMessageScroll = React.useRef(false);
  React.useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "user" && messagesRef.current) {
        isNewMessageScroll.current = true;
        setTimeout(() => {
          isNewMessageScroll.current = false;
        }, 300);
        scrollToBottom();
      }
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  // Check if content is scrollable
  React.useEffect(() => {
    const checkScroll = () => {
      if (messagesRef.current && !isNewMessageScroll.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
        const isScrollable = scrollHeight > clientHeight;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
        setShowScrollButton(isScrollable && !isAtBottom);
      }
    };

    const scrollContainer = messagesRef.current;
    if (scrollContainer) {
      checkScroll();
      scrollContainer.addEventListener("scroll", checkScroll);

      const resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(scrollContainer);

      return () => {
        scrollContainer.removeEventListener("scroll", checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, [messages]);

  return (
    <Box position="relative" flexGrow="1" overflow="hidden">
      <Flex
        ref={messagesRef}
        direction="column"
        px="3"
        py="4"
        style={{
          height: "100%",
          overflowY: "auto",
          // @ts-expect-error unknown property
          "--container-height": `${messagesRef.current?.clientHeight}px`,
        }}
      >
        {messages
          .filter((message: MessageType) => !message.hidden)
          .map((message: MessageType, index: number, visibleMessages) => (
            <Message
              key={message.id}
              message={message}
              isStreaming={isStreaming}
              isLast={index === visibleMessages.length - 1}
              isReady={isReady}
            />
          ))}

        {apiError && (
          <div className="chat-message-unmargin">
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
          </div>
        )}

        {isStreaming && messages[messages.length - 1].role !== "assistant" && (
          <div className="chat-message-unmargin">
            <Flex justify="center" p="3">
              <Spinner size="2" />
            </Flex>
          </div>
        )}
      </Flex>

      {showScrollButton && isReady && (
        <IconButton
          className="scroll-to-bottom-button"
          size="2"
          variant="surface"
          color="gray"
          radius="full"
          onClick={() => {
            scrollToBottom();
          }}
        >
          <ArrowDownIcon />
        </IconButton>
      )}
    </Box>
  );
};
