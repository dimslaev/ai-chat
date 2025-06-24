import * as vscode from "vscode";
import { Log } from "./log";
import { Provider } from "../../types";

export namespace Config {
  const log = Log.create({ service: "config" });

  export interface AppConfig {
    TEMPERATURE: number;
    HISTORY_LIMIT: number;
    MODEL: string;
    USE_TOOLS: boolean;
    PROVIDER: Provider;
  }

  export function get(): AppConfig {
    const extConfig = vscode.workspace.getConfiguration("aiChat");

    const config: AppConfig = {
      TEMPERATURE: 0.1,
      HISTORY_LIMIT: 10,
      MODEL: extConfig.get<string>("model") || "gpt-4",
      USE_TOOLS: extConfig.get<boolean>("toolsEnabled") || false,
      PROVIDER: (extConfig.get<string>("provider") || "openai") as Provider,
    };

    log.info("loaded config", {
      model: config.MODEL,
      provider: config.PROVIDER,
      tools: config.USE_TOOLS,
    });

    return config;
  }

  export function getApiKey(): string {
    const extConfig = vscode.workspace.getConfiguration("aiChat");
    return extConfig.get<string>("apiKey") || "no-key";
  }

  export function getBaseURL(): string | undefined {
    const extConfig = vscode.workspace.getConfiguration("aiChat");
    return extConfig.get<string>("baseURL");
  }

  export function setToolsEnabled(
    context: vscode.ExtensionContext,
    enabled: boolean
  ): void {
    log.info("updating tools enabled", { enabled });
    context.globalState.update("toolsEnabled", enabled);
  }

  export function onConfigurationChanged(
    callback: (config: AppConfig) => void
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("aiChat")) {
        log.info("configuration changed");
        callback(get());
      }
    });
  }
}
