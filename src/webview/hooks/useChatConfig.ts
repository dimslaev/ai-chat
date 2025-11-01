import { useCallback } from "react";
import { useChatStore } from "../store";
import { postMessage } from "../../utils/message";
import { Configuration } from "../../types";

/**
 * Hook for configuration management with side effects
 * Handles: saving configs to VSCode extension
 */
export const useChatConfig = () => {
  const vscode = useChatStore((state) => state.vscode);
  const setConfigs = useChatStore((state) => state.setConfigs);

  const saveConfigs = useCallback(
    (configs: Configuration[]) => {
      if (!vscode) return;

      setConfigs(configs);
      postMessage(vscode, "saveConfigs", configs);
    },
    [vscode, setConfigs]
  );

  return {
    saveConfigs,
  };
};
