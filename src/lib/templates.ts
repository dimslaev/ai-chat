import { Configuration } from "./types";
import { DEFAULT_SYSTEM_PROMPT } from "./config";

export type ConfigTemplate = Omit<Configuration, "id" | "name" | "active">;

export const CONFIG_TEMPLATES: {
  id: string;
  label: string;
  description?: string;
  infoUrl?: string;
  template: ConfigTemplate;
}[] = [
  {
    id: "blank",
    label: "Blank",
    template: {
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
    },
  },
  {
    id: "infomaniak-qwen-coder",
    label: "Infomaniak - Qwen 3 Coder",
    description: "Privacy-first Swiss cloud AI with Qwen 3 Coder (480B params)",
    infoUrl:
      "https://www.infomaniak.com/en/hosting/ai-services/open-source-models",
    template: {
      apiKey: "",
      baseUrl: "https://api.infomaniak.com/2/ai/[PRODUCT_ID]/openai/v1",
      model: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      maxCompletionTokens: 8000,
      temperature: 0.1,
      historyLimit: 10,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topP: 1,
    },
  },
  {
    id: "infomaniak-qwen",
    label: "Infomaniak - Qwen 3",
    description: "Privacy-first Swiss cloud AI with Qwen 3",
    infoUrl:
      "https://www.infomaniak.com/en/hosting/ai-services/open-source-models",
    template: {
      apiKey: "",
      baseUrl: "https://api.infomaniak.com/2/ai/[PRODUCT_ID]/openai/v1",
      model: "qwen3",
      maxCompletionTokens: 8000,
      temperature: 0.1,
      historyLimit: 10,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topP: 1,
    },
  },
  {
    id: "ollama-qwen3-coder",
    label: "Ollama - Qwen3 Coder 30B",
    description: "Local inference with Qwen3 Coder 30B",
    infoUrl: "https://ollama.com/library/qwen3-coder:30b",
    template: {
      apiKey: "",
      baseUrl: "http://localhost:11434/v1",
      model: "qwen3-coder:30b",
      maxCompletionTokens: 4096,
      temperature: 0.2,
      historyLimit: 8,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topP: 1,
    },
  },
  {
    id: "ollama-gpt-oss",
    label: "Ollama - GPT OSS 20B",
    description: "Local inference with GPT OSS 20B",
    infoUrl: "https://ollama.com/library/gpt-oss:20b",
    template: {
      apiKey: "",
      baseUrl: "http://localhost:11434/v1",
      model: "gpt-oss:20b",
      maxCompletionTokens: 4096,
      temperature: 0.2,
      historyLimit: 8,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topP: 1,
    },
  },
  {
    id: "ollama-custom",
    label: "Ollama - Custom",
    description: "Local inference with custom Ollama model",
    infoUrl: "https://ollama.com/library",
    template: {
      apiKey: "",
      baseUrl: "http://localhost:11434/v1",
      model: "",
      maxCompletionTokens: 4096,
      temperature: 0.2,
      historyLimit: 8,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topP: 1,
    },
  },
];
