import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { IconButton, Flex } from "@radix-ui/themes";
import { PaperPlaneIcon, StopIcon } from "@radix-ui/react-icons";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/useChatActions";

export const Input: React.FC = React.memo(() => {
  const isStreaming = useChatStore((state) => state.isStreaming);
  const configs = useChatStore((state) => state.configs);
  const inputValue = useChatStore((state) => state.inputValue);
  const setInputValue = useChatStore((state) => state.setInputValue);
  const setApiError = useChatStore((state) => state.setApiError);

  const { submitMessage, stopStream } = useChatActions();

  const activeConfig = configs.find((it) => it.active);
  const isModelConfigured = Boolean(
    activeConfig?.model && activeConfig?.baseUrl
  );

  const onSubmit = React.useCallback(() => {
    if (!inputValue.trim() || !isModelConfigured) return;
    submitMessage(inputValue);
    setInputValue("");
    setApiError(null);
  }, [
    inputValue,
    submitMessage,
    setApiError,
    isModelConfigured,
    setInputValue,
  ]);

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
    <Flex direction="row" gap="2" px="3" pb="3" align="end">
      <Flex
        position="relative"
        flexGrow="1"
        align="end"
        gap="2"
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-7)",
          padding: "12px",
        }}
      >
        <TextareaAutosize
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your code..."
          minRows={3}
          maxRows={30}
          className="chat-textarea"
        />

        <IconButton
          variant="soft"
          size="2"
          onClick={isStreaming ? stopStream : onSubmit}
          disabled={
            isStreaming ? false : !inputValue.trim() || !isModelConfigured
          }
          color={isStreaming ? "blue" : "gray"}
        >
          {isStreaming ? <StopIcon /> : <PaperPlaneIcon />}
        </IconButton>
      </Flex>
    </Flex>
  );
});
