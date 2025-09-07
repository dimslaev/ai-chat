import OpenAI from "openai";
import { Configuration } from "../types";
import { State } from "./state";

export namespace Config {
  const DEFAULT_CONFIG: Configuration = {
    id: "",
    name: "",
    active: false,
    apiKey: "",
    baseUrl: "",
    model: "",
    maxTokens: 8000,
    temperature: 0.1,
    historyLimit: 10,
    systemPrompt: "",
  } as const;

  async function load(): Promise<Configuration[]> {
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

  export async function save(configs: Configuration[]): Promise<void> {
    try {
      // Validate all configurations
      for (const config of configs) {
        const validationErrors = validate(config);
        if (validationErrors.length > 0) {
          throw new Error(
            `Invalid configuration "${config.name}": ${validationErrors.join(
              ", "
            )}`
          );
        }
      }

      // Ensure only one config is marked as active
      const activeConfigs = configs.filter((config) => config.active);
      if (activeConfigs.length !== 1) {
        throw new Error("Exactly one configuration must be marked as active");
      }

      await State.context.globalState.update("aiChatConfigs", configs);
      State.setConfigs(configs);

      // Update current active config
      const activeConfig = configs.find((config) => config.active)!;
      State.setConfig(activeConfig);
      State.setClient(
        new OpenAI({
          apiKey: activeConfig.apiKey || "no-key",
          baseURL: activeConfig.baseUrl,
        })
      );

      console.log("Configurations saved successfully");
    } catch (error) {
      console.error("Failed to save configurations:", error);
      throw error;
    }
  }

  function validate(config: Configuration): string[] {
    const errors: string[] = [];

    if (!config.baseUrl || config.baseUrl.trim() === "") {
      errors.push("Base URL is required");
    }

    if (!config.model || config.model.trim() === "") {
      errors.push("Model is required");
    }

    return errors;
  }

  export async function initialize(): Promise<void> {
    try {
      const configs = await load();

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
      State.setClient(
        new OpenAI({
          apiKey: activeConfig.apiKey || "no-key",
          baseURL: activeConfig.baseUrl,
        })
      );
    } catch (error) {
      console.error("Failed to load configuration:", error);
      State.setConfig({ ...DEFAULT_CONFIG });
      State.setConfigs([]);
    }
  }
}
