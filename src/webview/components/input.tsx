import * as React from "react";
import { Button, Flex, TextArea, Box } from "@radix-ui/themes";
import { IconStart, IconStop } from "./icons";
import { useChatStore } from "../store";

export const Input: React.FC = React.memo(() => {
  const isStreaming = useChatStore((state) => state.isStreaming);
  const isLoading = useChatStore((state) => state.isLoading);

  const setApiError = useChatStore((state) => state.setApiError);
  const setShouldAutoScroll = useChatStore(
    (state) => state.setShouldAutoScroll
  );
  const handleSubmit = useChatStore((state) => state.handleSubmit);
  const handleStopStream = useChatStore((state) => state.handleStopStream);

  const [inputValue, setInputValue] = React.useState("");

  const onSubmit = React.useCallback(() => {
    if (!inputValue.trim()) return;
    handleSubmit(inputValue);
    setInputValue("");
    setShouldAutoScroll(true);
    setApiError(null);
  }, [inputValue, handleSubmit, setShouldAutoScroll, setApiError]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

  const isDisabled = isStreaming || isLoading;

  return (
    <Flex direction="row" gap="2" p="3" align="end">
      <Box
        style={{
          position: "relative",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-7)",
          padding: "8px",
          paddingRight: "48px",
          flex: 1,
        }}
      >
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          style={{
            minHeight: "80px",
            maxHeight: "160px",
            border: "none",
            background: "transparent",
            padding: "0",
            boxShadow: "none",
          }}
        />

        <Button
          variant="ghost"
          size="2"
          onClick={isStreaming ? handleStopStream : onSubmit}
          disabled={(!isStreaming && !inputValue.trim()) || isLoading}
          color={isStreaming ? "blue" : "gray"}
          style={{
            position: "absolute",
            right: "8px",
            bottom: "8px",
            minWidth: "32px",
            height: "32px",
            padding: "0",
          }}
          className="no-hover"
        >
          {isStreaming ? <IconStop /> : <IconStart />}
        </Button>
      </Box>
    </Flex>
  );
});
