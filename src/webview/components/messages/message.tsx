import { Pencil1Icon } from "@radix-ui/react-icons";
import { Box, IconButton } from "@radix-ui/themes";
import cn from "classnames";
import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";

import { Markdown } from "@/components/messages//markdown";
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

  return (
    <Box
      ref={messageRef}
      p={message.role === "user" ? "3" : "0"}
      className={cn(
        "chat-message",
        `chat-message-${message.role}`,
        message.role === "user" && "chat-message-margin",
        message.role === "assistant" && "chat-message-unmargin",
        isStreaming && "chat-message-streaming",
      )}
      style={{ visibility: isReady ? "visible" : "hidden" }}
    >
      {message.role === "user" ? (
        <span style={{ whiteSpace: "pre-line" }}>{message.content}</span>
      ) : (
        <Markdown content={message.content} />
      )}

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
    </Box>
  );
};
