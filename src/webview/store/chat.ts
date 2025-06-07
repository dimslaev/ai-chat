import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  Message,
  AttachedFile,
  ApiError,
  vscodeApi,
  PostMessage,
} from "../../types";
import { postMessage } from "../../utils/message";

export interface ChatStore {
  vscode: vscodeApi | null;
  messages: Message[];
  isStreaming: boolean;
  isLoading: boolean;
  attachedFiles: AttachedFile[];
  suggestedFile: AttachedFile | null;
  apiError: ApiError;
  toolsEnabled: boolean;
  shouldAutoScroll: boolean;

  setMessages: (messages: Message[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setAttachedFiles: (files: AttachedFile[]) => void;
  setSuggestedFile: (file: AttachedFile | null) => void;
  setApiError: (error: ApiError) => void;
  setToolsEnabled: (enabled: boolean) => void;
  setShouldAutoScroll: (scroll: boolean) => void;
  setVscode: (vscode: vscodeApi) => void;

  addMessage: (message: Message) => void;
  appendToLastMessage: (content: string) => void;
  addAttachedFile: (file: AttachedFile) => void;
  removeAttachedFile: (file: AttachedFile) => void;
  handleSubmit: (content: string) => void;
  handleStopStream: () => void;
  attachFile: () => void;
  removeFile: (file: AttachedFile) => void;
  cleanup: () => void;
  toggleTools: () => void;

  restoreState: (state: {
    history: Message[];
    attachedFiles: AttachedFile[];
    suggestedFile: AttachedFile | null;
    toolsEnabled: boolean;
  }) => void;

  handleMessage: (event: MessageEvent<PostMessage>) => void;

  initialize: () => void;
}

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    messages: [],
    isStreaming: false,
    isLoading: false,
    attachedFiles: [],
    suggestedFile: null,
    apiError: null,
    toolsEnabled: false,
    shouldAutoScroll: true,
    vscode: null,

    setMessages: (messages) => set({ messages }),
    setIsStreaming: (isStreaming) => set({ isStreaming }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setAttachedFiles: (attachedFiles) => set({ attachedFiles }),
    setSuggestedFile: (suggestedFile) => set({ suggestedFile }),
    setApiError: (apiError) => set({ apiError }),
    setToolsEnabled: (toolsEnabled) => {
      const { vscode } = get();
      set({ toolsEnabled });
      if (vscode) {
        postMessage(vscode, "toggleTools", toolsEnabled);
      }
    },
    setShouldAutoScroll: (shouldAutoScroll) => set({ shouldAutoScroll }),
    setVscode: (vscode) => set({ vscode }),

    addMessage: (message) =>
      set((state) => ({ messages: [...state.messages, message] })),

    appendToLastMessage: (content) =>
      set((state) => {
        const newMessages = [...state.messages];
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          lastMessage.content = lastMessage.content + content;
        }
        return { messages: newMessages };
      }),

    addAttachedFile: (file) =>
      set((state) => ({ attachedFiles: [...state.attachedFiles, file] })),

    removeAttachedFile: (fileToRemove) =>
      set((state) => ({
        attachedFiles: state.attachedFiles.filter(
          (file) => file.fileUri.path !== fileToRemove.fileUri.path
        ),
      })),

    handleSubmit: (content) => {
      const { isStreaming, isLoading, vscode } = get();
      if (!content.trim() || isStreaming || isLoading || !vscode) return;

      set({ isLoading: true });

      const newMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
      };

      get().addMessage(newMessage);
      postMessage(vscode, "sendMessage", newMessage);
    },

    handleStopStream: () => {
      const { vscode } = get();
      if (!vscode) return;

      postMessage(vscode, "stopStream");
      set({ isStreaming: false, isLoading: false });
    },

    attachFile: () => {
      const { suggestedFile, vscode } = get();
      if (!suggestedFile || !vscode) return;

      postMessage(vscode, "attachFile", suggestedFile);
      get().addAttachedFile(suggestedFile);
    },

    removeFile: (fileToRemove) => {
      const { vscode } = get();
      if (!vscode) return;

      get().removeAttachedFile(fileToRemove);
      postMessage(vscode, "removeAttachedFile", fileToRemove);
    },

    cleanup: () => {
      const { vscode } = get();
      if (!vscode) return;

      set({ messages: [], attachedFiles: [] });
      postMessage(vscode, "cleanup");
    },

    toggleTools: () => {
      const { toolsEnabled, vscode } = get();
      if (!vscode) return;

      const newToolsEnabled = !toolsEnabled;
      set({ toolsEnabled: newToolsEnabled });
      postMessage(vscode, "toggleTools", newToolsEnabled);
    },

    restoreState: (state) => {
      set({
        messages: state.history,
        attachedFiles: state.attachedFiles,
        suggestedFile: state.suggestedFile,
        toolsEnabled: state.toolsEnabled,
      });
    },

    handleMessage: (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case "setState":
          get().restoreState(payload);
          break;

        case "startAssistantMessage":
          set({ isStreaming: true, isLoading: false });
          get().addMessage({
            id: Date.now().toString(),
            role: "assistant",
            content: "",
          });
          break;

        case "appendChunk":
          get().appendToLastMessage(payload);
          break;

        case "endAssistantMessage":
          set({ isStreaming: false });
          break;

        case "activeFileChanged":
          set({ suggestedFile: payload });
          break;

        case "apiError":
          set({ apiError: payload, isLoading: false });
          break;
      }
    },

    initialize: () => {
      const { vscode } = get();
      if (!vscode) return;

      // Request initial state from extension
      postMessage(vscode, "getState");

      const messageListener = (event: MessageEvent<PostMessage>) => {
        get().handleMessage(event);
      };

      window.addEventListener("message", messageListener);

      return () => window.removeEventListener("message", messageListener);
    },
  }))
);
