import { useCallback } from "react";

import { parseImportConfig,validateConfigStrict } from "@/lib/schema";
import { Configuration } from "@/lib/types";
import { postMessage } from "@/lib/utils";
import { useChatStore } from "@/store/chat";

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
    [vscode, setConfigs],
  );

  const selectConfig = useCallback(
    (configId: string) => {
      const updatedConfigs = configs.map((c) => ({
        ...c,
        active: c.id === configId,
      }));
      saveConfigs(updatedConfigs);
    },
    [configs, saveConfigs],
  );

  const deleteConfig = useCallback(
    (configId: string) => {
      const updatedConfigs = configs.filter((c) => c.id !== configId);
      // If we deleted the active config, make the first one active
      if (updatedConfigs.length > 0 && !updatedConfigs.some((c) => c.active)) {
        updatedConfigs[0].active = true;
      }
      saveConfigs(updatedConfigs);
    },
    [configs, saveConfigs],
  );

  const createConfig = useCallback(
    (config: Configuration) => {
      const validatedConfig = validateConfigStrict(config);
      // Deactivate all other configs and add the new one as active
      const updatedConfigs = configs.map((c) => ({ ...c, active: false }));
      updatedConfigs.push({ ...validatedConfig, active: true });
      saveConfigs(updatedConfigs);
    },
    [configs, saveConfigs],
  );

  const updateConfig = useCallback(
    (config: Configuration) => {
      const validatedConfig = validateConfigStrict(config);
      const updatedConfigs = configs.map((c) =>
        c.id === validatedConfig.id ? validatedConfig : c,
      );
      saveConfigs(updatedConfigs);
    },
    [configs, saveConfigs],
  );

  const importConfig = useCallback(
    (rawConfig: any) => {
      const result = parseImportConfig(rawConfig);

      if (result.error) {
        throw new Error(result.error);
      }

      // Create new config and set as active
      const newConfig: Configuration = {
        ...result.data!,
        id: Date.now().toString(),
        active: true,
      };

      // Deactivate other configs
      const updatedConfigs = configs.map((c) => ({ ...c, active: false }));
      updatedConfigs.push(newConfig);
      saveConfigs(updatedConfigs);
    },
    [configs, saveConfigs],
  );

  const exportConfig = useCallback(
    (config: Configuration) => {
      if (!vscode) return;

      postMessage(vscode, "exportConfig", config);
    },
    [vscode],
  );

  return {
    configs,
    activeConfig: configs.find((c) => c.active),
    saveConfigs,
    selectConfig,
    deleteConfig,
    createConfig,
    updateConfig,
    importConfig,
    exportConfig,
  };
};
