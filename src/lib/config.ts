import { Configuration } from "./types";

export const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant specialized in software development and code generation.

For code-related prompts, prioritize code output with minimal explanation.
When modifying previously generated code, return only the updated sections.
For refactoring requests, provide the refactored code and a very short summary of changes.
Always deliver clear, concise and efficient answers.`;

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
};
