import { useCallback } from "react";
import { useChatStore } from "@/store/chat";
import { postMessage } from "@/lib/utils";
import { AttachedFile, Message } from "@/lib/types";

/**
 * Hook for user-triggered chat actions with side effects
 * Handles: message submission, editing, file attachments, streaming control, cleanup
 */
export const useChatActions = () => {
  const vscode = useChatStore((state) => state.vscode);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const suggestedFile = useChatStore((state) => state.suggestedFile);

  const setIsStreaming = useChatStore((state) => state.setIsStreaming);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const addAttachedFile = useChatStore((state) => state.addAttachedFile);
  const removeAttachedFile = useChatStore((state) => state.removeAttachedFile);
  const clearChat = useChatStore((state) => state.clearChat);

  const submitMessage = useCallback(
    (content: string) => {
      if (!content.trim() || isStreaming || !vscode) return;

      setIsStreaming(true);

      const newMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
      };

      addMessage(newMessage);
      postMessage(vscode, "sendMessage", newMessage);
    },
    [vscode, isStreaming, setIsStreaming, addMessage]
  );

  const editMessage = useCallback(
    (id: string, content: string) => {
      if (!content.trim() || isStreaming || !vscode) return;

      setIsStreaming(true);
      updateMessage(id, content);
      postMessage(vscode, "editMessage", { id, content: content.trim() });
    },
    [vscode, isStreaming, setIsStreaming, updateMessage]
  );

  const stopStream = useCallback(() => {
    if (!vscode) return;

    postMessage(vscode, "stopStream");
    setIsStreaming(false);
  }, [vscode, setIsStreaming]);

  const attachFile = useCallback(() => {
    if (!suggestedFile || !vscode) return;

    postMessage(vscode, "attachFile", suggestedFile);
    addAttachedFile(suggestedFile);
  }, [vscode, suggestedFile, addAttachedFile]);

  const removeFile = useCallback(
    (file: AttachedFile) => {
      if (!vscode) return;

      removeAttachedFile(file);
      postMessage(vscode, "removeAttachedFile", file);
    },
    [vscode, removeAttachedFile]
  );

  const cleanup = useCallback(() => {
    if (!vscode) return;

    clearChat();
    postMessage(vscode, "cleanup");
  }, [vscode, clearChat]);

  const clearFiles = useCallback(() => {
    if (!vscode) return;

    const currentFiles = useChatStore.getState().attachedFiles;
    currentFiles.forEach((file) => {
      removeAttachedFile(file);
      postMessage(vscode, "removeAttachedFile", file);
    });
  }, [vscode, removeAttachedFile]);

  const saveChat = useCallback(() => {
    if (!vscode) return;

    const messages = useChatStore.getState().messages;
    if (messages.length === 0) return;

    const markdownContent = messages
      .map((message) => {
        const role = message.role === "user" ? "User" : "Assistant";
        return `## ${role}\n\n${message.content}\n`;
      })
      .join("\n");

    postMessage(vscode, "saveChat", markdownContent);
  }, [vscode]);

  return {
    submitMessage,
    editMessage,
    stopStream,
    attachFile,
    removeFile,
    cleanup,
    clearFiles,
    saveChat,
  };
};
