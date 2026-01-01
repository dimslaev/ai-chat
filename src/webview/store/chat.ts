import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import {
  ApiError,
  AttachedFile,
  Configuration,
  Message,
  Plan,
  TokenUsage,
  vscodeApi,
} from "@/lib/types";

export interface ChatStore {
  // State
  vscode: vscodeApi | null;
  messages: Message[];
  isStreaming: boolean;
  attachedFiles: AttachedFile[];
  suggestedFile: AttachedFile | null;
  apiError: ApiError;
  configs: Configuration[];
  tokenUsage: TokenUsage;
  inputValue: string;
  agentMode: boolean;
  plan: Plan | null;

  // Pure setters
  setVscode: (vscode: vscodeApi) => void;
  setMessages: (messages: Message[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  setAttachedFiles: (files: AttachedFile[]) => void;
  setSuggestedFile: (file: AttachedFile | null) => void;
  setApiError: (error: ApiError) => void;
  setConfigs: (configs: Configuration[]) => void;
  setTokenUsage: (usage: TokenUsage) => void;
  setInputValue: (value: string) => void;
  setAgentMode: (enabled: boolean) => void;
  setPlan: (plan: Plan | null) => void;

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
    inputValue?: string;
    plan: Plan | null;
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
    tokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    inputValue: "",
    agentMode: false,
    plan: null,

    // Pure setters
    setVscode: (vscode) => set({ vscode }),
    setMessages: (messages) => set({ messages }),
    setIsStreaming: (isStreaming) => set({ isStreaming }),
    setAttachedFiles: (attachedFiles) => set({ attachedFiles }),
    setSuggestedFile: (suggestedFile) => set({ suggestedFile }),
    setApiError: (apiError) => set({ apiError }),
    setConfigs: (configs) => set({ configs }),
    setTokenUsage: (tokenUsage) => set({ tokenUsage }),
    setInputValue: (inputValue) => set({ inputValue }),
    setAgentMode: (agentMode) => set({ agentMode }),
    setPlan: (plan) => set({ plan }),

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
          (file) => file.fileUri.path !== fileToRemove.fileUri.path,
        ),
      })),

    clearChat: () =>
      set({
        messages: [],
        attachedFiles: [],
        apiError: null,
        inputValue: "",
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        plan: null,
      }),

    restoreState: (state) =>
      set({
        messages: state.history,
        attachedFiles: state.attachedFiles,
        suggestedFile: state.suggestedFile,
        configs: state.configs,
        inputValue: state.inputValue || "",
        apiError: null,
        plan: state.plan,
      }),
  })),
);
