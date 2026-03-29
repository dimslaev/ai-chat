import { Pencil1Icon } from "@radix-ui/react-icons";
import { Box, IconButton } from "@radix-ui/themes";
import cn from "classnames";
import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";

import { Markdown } from "@/components/messages/markdown";
import { ToolMessage } from "@/components/messages/tool-message";
import { CopyButton } from "@/components/ui/copy-button";
import { useChatActions } from "@/hooks/use-chat-actions";
import { Message as MessageType } from "@/lib/types";
import { useChatStore } from "@/store/chat";

interface MessageProps {
  message: MessageType;
  isStreaming: boolean;
  isReady: boolean;
  isLast: boolean;
}

export const Message: React.FC<MessageProps> = ({
  message,
  isStreaming,
  isReady,
}) => {
  const messageRef = React.useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);

  const { editMessage } = useChatActions();
  const setApiError = useChatStore((state) => state.setApiError);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      editMessage(message.id, editContent.trim());
      setApiError(null);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  if (isEditing && message.role === "user") {
    return (
      <div className="chat-message-margin">
        <TextareaAutosize
          autoFocus
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setIsEditing(false)}
          minRows={3}
          maxRows={10}
          className="chat-textarea chat-textarea-edit"
        />
      </div>
    );
  }

  const renderContent = () => {
    if (message.role === "user") {
      return <span style={{ whiteSpace: "pre-line" }}>{message.content}</span>;
    }

    if (message.role === "tool") {
      return <ToolMessage message={message} />;
    }

    return <Markdown content={message.content} />;
  };

  return (
    <div
      ref={messageRef}
      className={cn(
        `chat-message-${message.role}`,
        message.role === "user" && "chat-message-margin",
      )}
      style={{ visibility: isReady ? "visible" : "hidden" }}
    >
      <Box p={message.role === "user" ? "3" : "0"} className="chat-message">
        {renderContent()}

        {message.role === "user" && !isEditing && (
          <IconButton
            size="2"
            variant="soft"
            color="gray"
            className="action-button"
            onClick={handleEditClick}
          >
            <Pencil1Icon />
          </IconButton>
        )}

        {message.role === "assistant" && (
          <div
            className="action-button"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              visibility: isStreaming ? "hidden" : "visible",
              marginRight: "var(--space-2)",
            }}
          >
            <CopyButton text={message.content} />
          </div>
        )}
      </Box>
    </div>
  );
};
