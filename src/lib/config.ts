import { Configuration } from "./types";

export const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant specialized in software development and code generation.

For code-related prompts, prioritize code output with minimal explanation.
When modifying previously generated code, return only the updated sections.
For refactoring requests, provide the refactored code and a very short summary of changes.
Always deliver clear, concise and efficient answers.`;

export const DEFAULT_BASE_URL =
  "https://api.infomaniak.com/2/ai/[PRODUCT_ID]/openai/v1";

export const MODELS = [
  {
    label: "Qwen 3 Coder",
    value: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  },
  {
    label: "Qwen 3",
    value: "qwen3",
  },
  {
    label: "Mistral 24B",
    value: "mistral24b",
  },
  {
    label: "Mistral 3",
    value: "mistral3",
  },
  {
    label: "Custom",
    value: "custom",
  },
];

export const DEFAULT_CONFIG: Configuration = {
  id: "",
  name: "",
  active: false,
  apiKey: "",
  baseUrl: DEFAULT_BASE_URL,
  model: MODELS[0].value,
  maxCompletionTokens: 8000,
  temperature: 0.1,
  historyLimit: 10,
  systemPrompt: "",
  frequencyPenalty: 0,
  presencePenalty: 0,
  topP: 1,
};
