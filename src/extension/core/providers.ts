import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModel } from "ai";

import { Configuration } from "@/lib/types";

const MISTRAL_MODEL_PREFIXES = [
  "mistral",
  "devstral",
  "codestral",
  "pixtral",
  "ministral",
  "open-mistral",
  "open-codestral",
];

function isMistralModel(model: string): boolean {
  const lowerModel = model.toLowerCase();
  return MISTRAL_MODEL_PREFIXES.some((prefix) => lowerModel.includes(prefix));
}

export function createModel(config: Configuration): LanguageModel {
  if (isMistralModel(config.model)) {
    const mistral = createMistral({
      apiKey: config.apiKey || "no-key",
      baseURL: config.baseUrl || undefined,
    });
    return mistral.chat(config.model);
  }

  const openai = createOpenAI({
    apiKey: config.apiKey || "no-key",
    baseURL: config.baseUrl || undefined,
  });
  return openai.chat(config.model);
}
