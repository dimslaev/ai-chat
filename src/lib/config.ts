import { Configuration } from "./types";

export const DEFAULT_CONFIG: Configuration = {
  id: "",
  name: "",
  active: false,
  apiKey: "",
  baseUrl: "",
  model: "",
  maxCompletionTokens: 8000,
  temperature: 0.1,
  historyLimit: 10,
  systemPrompt: "",
  frequencyPenalty: 0,
  presencePenalty: 0,
  topP: 1,
  toolReadFile: true,
  toolListDirectory: true,
  toolSearchFiles: true,
  toolMaxRounds: 10,
};
