import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  Message,
  AttachedFile,
  ApiError,
  vscodeApi,
  Configuration,
} from "../../types";

export interface ChatStore {
  // State
  vscode: vscodeApi | null;
  messages: Message[];
  isStreaming: boolean;
  attachedFiles: AttachedFile[];
  suggestedFile: AttachedFile | null;
  apiError: ApiError;
  configs: Configuration[];

  // Pure setters
  setVscode: (vscode: vscodeApi) => void;
  setMessages: (messages: Message[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  setAttachedFiles: (files: AttachedFile[]) => void;
  setSuggestedFile: (file: AttachedFile | null) => void;
  setApiError: (error: ApiError) => void;
  setConfigs: (configs: Configuration[]) => void;

  // Simple state operations (no side effects)
  addMessage: (message: Message) => void;
  appendToLastMessage: (content: string) => void;
  updateMessage: (id: string, content: string) => void;
  addAttachedFile: (file: AttachedFile) => void;
  removeAttachedFile: (file: AttachedFile) => void;
  clearChat: () => void;

  restoreState: (state: {
    history: Message[];
    attachedFiles: AttachedFile[];
    suggestedFile: AttachedFile | null;
    configs: Configuration[];
  }) => void;
}

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    vscode: null,
    messages: [],
    isStreaming: false,
    attachedFiles: [],
    suggestedFile: null,
    apiError: null,
    configs: [],

    // Pure setters
    setVscode: (vscode) => set({ vscode }),
    setMessages: (messages) => set({ messages }),
    setIsStreaming: (isStreaming) => set({ isStreaming }),
    setAttachedFiles: (attachedFiles) => set({ attachedFiles }),
    setSuggestedFile: (suggestedFile) => set({ suggestedFile }),
    setApiError: (apiError) => set({ apiError }),
    setConfigs: (configs) => set({ configs }),

    // Simple state operations
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

    updateMessage: (id, content) =>
      set((state) => {
        const messageIndex = state.messages.findIndex((msg) => msg.id === id);
        if (messageIndex === -1) return state;

        const updatedMessages = [...state.messages];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          content: content.trim(),
        };

        const truncatedMessages = updatedMessages.slice(0, messageIndex + 1);
        return { messages: truncatedMessages };
      }),

    addAttachedFile: (file) =>
      set((state) => ({ attachedFiles: [...state.attachedFiles, file] })),

    removeAttachedFile: (fileToRemove) =>
      set((state) => ({
        attachedFiles: state.attachedFiles.filter(
          (file) => file.fileUri.path !== fileToRemove.fileUri.path
        ),
      })),

    clearChat: () => set({ messages: [], attachedFiles: [], apiError: null }),

    restoreState: (state) =>
      set({
        messages: state.history,
        attachedFiles: state.attachedFiles,
        suggestedFile: state.suggestedFile,
        configs: state.configs,
        apiError: null,
      }),
  }))
);
