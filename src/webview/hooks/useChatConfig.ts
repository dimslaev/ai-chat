import { useCallback } from "react";
import { useChatStore } from "@/store/chat";
import { postMessage } from "@/lib/utils";
import { Configuration } from "@/lib/types";

/**
 * Hook for configuration management with side effects
 * Handles: saving configs to VSCode extension
 */
export const useChatConfig = () => {
  const vscode = useChatStore((state) => state.vscode);
  const configs = useChatStore((state) => state.configs);
  const setConfigs = useChatStore((state) => state.setConfigs);

  const saveConfigs = useCallback(
    (configs: Configuration[]) => {
      if (!vscode) return;

      setConfigs(configs);
      postMessage(vscode, "saveConfigs", configs);
    },
    [vscode, setConfigs]
  );

  const exportConfig = useCallback(
    (config: Configuration) => {
      if (!vscode) return;

      postMessage(vscode, "exportConfig", config);
    },
    [vscode]
  );

  return {
    configs,
    activeConfig: configs.find((c) => c.active),
    saveConfigs,
    exportConfig,
  };
};
