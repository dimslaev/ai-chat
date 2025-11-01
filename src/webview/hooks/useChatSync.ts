import { useEffect } from "react";
import { useChatStore } from "../store";
import { postMessage } from "../../lib/utils";
import { PostMessage } from "../../lib/types";

/**
 * Hook for VSCode message synchronization
 * Handles: initialization, message event listening, state restoration
 */
export const useChatSync = () => {
  const vscode = useChatStore((state) => state.vscode);
  const setIsStreaming = useChatStore((state) => state.setIsStreaming);
  const setSuggestedFile = useChatStore((state) => state.setSuggestedFile);
  const setApiError = useChatStore((state) => state.setApiError);
  const setConfigs = useChatStore((state) => state.setConfigs);
  const addMessage = useChatStore((state) => state.addMessage);
  const appendToLastMessage = useChatStore(
    (state) => state.appendToLastMessage
  );
  const restoreState = useChatStore((state) => state.restoreState);

  useEffect(() => {
    if (!vscode) return;

    // Request initial state from extension
    postMessage(vscode, "getState");

    const handleMessage = (event: MessageEvent<PostMessage>) => {
      const { type, payload } = event.data;

      switch (type) {
        case "setState":
          restoreState(payload);
          break;

        case "startAssistantMessage":
          addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: "",
          });
          break;

        case "appendChunk":
          appendToLastMessage(payload);
          break;

        case "endAssistantMessage":
          setIsStreaming(false);
          break;

        case "activeFileChanged":
          setSuggestedFile(payload);
          break;

        case "apiError":
          setApiError(payload);
          setIsStreaming(false);
          break;

        case "getConfigs":
          setConfigs(payload);
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [
    vscode,
    setIsStreaming,
    setSuggestedFile,
    setApiError,
    setConfigs,
    addMessage,
    appendToLastMessage,
    restoreState,
  ]);
};
