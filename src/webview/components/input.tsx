import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button, Flex, Box } from "@radix-ui/themes";
import { PaperPlaneIcon, StopIcon } from "@radix-ui/react-icons";
import { useChatStore } from "../store";
import { useChatActions } from "../hooks";

export const Input: React.FC = React.memo(() => {
  const isStreaming = useChatStore((state) => state.isStreaming);
  const configs = useChatStore((state) => state.configs);
  const setApiError = useChatStore((state) => state.setApiError);

  const { submitMessage, stopStream } = useChatActions();

  const [inputValue, setInputValue] = React.useState("");

  const activeConfig = configs.find((it) => it.active);
  const isModelConfigured = Boolean(
    activeConfig?.model && activeConfig?.baseUrl
  );

  const onSubmit = React.useCallback(() => {
    if (!inputValue.trim() || !isModelConfigured) return;
    submitMessage(inputValue);
    setInputValue("");
    setApiError(null);
  }, [inputValue, submitMessage, setApiError, isModelConfigured]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

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
        <TextareaAutosize
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          minRows={3}
          maxRows={30}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            padding: "0",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            fontSize: "0.945rem",
            lineHeight: "1.5",
            color: "inherit",
          }}
        />

        <Button
          variant="ghost"
          size="2"
          onClick={isStreaming ? stopStream : onSubmit}
          disabled={
            isStreaming ? false : !inputValue.trim() || !isModelConfigured
          }
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
          {isStreaming ? <StopIcon /> : <PaperPlaneIcon />}
        </Button>
      </Box>
    </Flex>
  );
});
