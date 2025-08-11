import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  Message,
  AttachedFile,
  ApiError,
  vscodeApi,
  PostMessage,
  Configuration,
} from "../../types";
import { postMessage } from "../../utils/message";

export interface ChatStore {
  vscode: vscodeApi | null;
  messages: Message[];
  isStreaming: boolean;
  attachedFiles: AttachedFile[];
  suggestedFile: AttachedFile | null;
  apiError: ApiError;
  configs: Configuration[];

  setMessages: (messages: Message[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  setAttachedFiles: (files: AttachedFile[]) => void;
  setSuggestedFile: (file: AttachedFile | null) => void;
  setApiError: (error: ApiError) => void;
  setVscode: (vscode: vscodeApi) => void;
  setConfigs: (configs: Configuration[]) => void;

  addMessage: (message: Message) => void;
  appendToLastMessage: (content: string) => void;
  addAttachedFile: (file: AttachedFile) => void;
  removeAttachedFile: (file: AttachedFile) => void;
  handleSubmit: (content: string) => void;
  editMessage: (id: string, content: string) => void;
  handleStopStream: () => void;
  attachFile: () => void;
  removeFile: (file: AttachedFile) => void;
  cleanup: () => void;
  saveConfigs: (configs: Configuration[]) => void;

  restoreState: (state: {
    history: Message[];
    attachedFiles: AttachedFile[];
    suggestedFile: AttachedFile | null;
    configs: Configuration[];
  }) => void;

  handleMessage: (event: MessageEvent<PostMessage>) => void;

  initialize: () => void;
}

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    messages: [],
    isStreaming: false,
    attachedFiles: [],
    suggestedFile: null,
    apiError: null,
    vscode: null,
    configs: [],

    setMessages: (messages) => set({ messages }),
    setIsStreaming: (isStreaming) => set({ isStreaming }),
    setAttachedFiles: (attachedFiles) => set({ attachedFiles }),
    setSuggestedFile: (suggestedFile) => set({ suggestedFile }),
    setApiError: (apiError) => set({ apiError }),
    setVscode: (vscode) => set({ vscode }),
    setConfigs: (configs) => set({ configs }),

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
      const { isStreaming, vscode } = get();
      if (!content.trim() || isStreaming || !vscode) return;

      set({ isStreaming: true });

      const newMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
      };

      get().addMessage(newMessage);
      postMessage(vscode, "sendMessage", newMessage);
    },

    editMessage: (id, content) => {
      const { isStreaming, vscode, messages } = get();
      if (!content.trim() || isStreaming || !vscode) return;

      const messageIndex = messages.findIndex((msg) => msg.id === id);
      if (messageIndex === -1) return;

      set({ isStreaming: true });

      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: content.trim(),
      };

      const truncatedMessages = updatedMessages.slice(0, messageIndex + 1);

      set({ messages: truncatedMessages });
      postMessage(vscode, "editMessage", { id, content: content.trim() });
    },

    handleStopStream: () => {
      const { vscode } = get();
      if (!vscode) return;

      postMessage(vscode, "stopStream");
      set({ isStreaming: false });
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

      set({ messages: [], attachedFiles: [], apiError: null });
      postMessage(vscode, "cleanup");
    },

    saveConfigs: (configs) => {
      const { vscode } = get();
      if (!vscode) return;

      set({ configs });
      postMessage(vscode, "saveConfigs", configs);
    },

    restoreState: (state) => {
      set({
        messages: state.history,
        attachedFiles: state.attachedFiles,
        suggestedFile: state.suggestedFile,
        configs: state.configs,
      });
    },

    handleMessage: (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case "setState":
          get().restoreState(payload);
          break;

        case "startAssistantMessage":
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
          set({ apiError: payload, isStreaming: false });
          break;

        case "getConfigs":
          set({ configs: payload });
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
