import { State } from "@/extension/core/state";
import { DEFAULT_CONFIG } from "@/lib/config";
import { Configuration } from "@/lib/types";

/**
 * Configuration loading, saving, and validation
 * via VSCode global state
 */

class ConfigManager {
  // Loads configs from storage and sets the active one
  async init(): Promise<void> {
    try {
      const configs = await this.load();

      if (configs.length === 0) {
        State.setConfig({ ...DEFAULT_CONFIG });
        State.setConfigs([]);
        return;
      }

      const activeConfig = configs.find((config) => config.active);
      if (!activeConfig) {
        throw new Error("No active config");
      }

      State.setConfig(activeConfig);
      State.setConfigs(configs);
    } catch (error) {
      console.error("Failed to load configuration:", error);
      State.setConfig({ ...DEFAULT_CONFIG });
      State.setConfigs([]);
    }
  }

  // Reads configs array from VSCode global state
  async load(): Promise<Configuration[]> {
    try {
      const configs = (await State.context.globalState.get("aiChatConfigs")) as
        | Configuration[]
        | undefined;

      if (!Array.isArray(configs) || configs.length === 0) {
        return [];
      }

      return configs;
    } catch (error) {
      console.error("Failed to load configuration:", error);
      return [];
    }
  }

  // Persists configs to VSCode global state
  async save(configs: Configuration[]): Promise<void> {
    try {
      for (const config of configs) {
        const validationErrors = this.validate(config);
        if (validationErrors.length > 0) {
          throw new Error(
            `Invalid configuration "${config.name}": ${validationErrors.join(
              ", ",
            )}`,
          );
        }
      }

      const activeConfigs = configs.filter((config) => config.active);
      if (activeConfigs.length !== 1) {
        throw new Error("Exactly one configuration must be marked as active");
      }

      await State.context.globalState.update("aiChatConfigs", configs);
      State.setConfigs(configs);

      const activeConfig = configs.find((config) => config.active)!;
      State.setConfig(activeConfig);

      console.log("Configurations saved successfully");
    } catch (error) {
      console.error("Failed to save configurations:", error);
      throw error;
    }
  }

  // Checks required fields and returns validation errors
  validate(config: Configuration): string[] {
    const errors: string[] = [];

    if (!config.baseUrl || config.baseUrl.trim() === "") {
      errors.push("Base URL is required");
    }

    if (!config.model || config.model.trim() === "") {
      errors.push("Model is required");
    }

    return errors;
  }
}

export const Config = new ConfigManager();
