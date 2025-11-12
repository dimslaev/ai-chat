import * as React from "react";
import { Configuration } from "@/lib/types";
import { DEFAULT_CONFIG, MODELS } from "@/lib/config";
import { ConfigurationSchema } from "@/lib/schema";

// Convert numeric fields to strings for form editing
type StringifyNumbers<T> = {
  [K in keyof T]: T[K] extends number ? string | number : T[K];
};
export type FormData = StringifyNumbers<Configuration> & {
  customModel?: string;
};

function serializeConfig(config: Configuration): FormData {
  const isCustomModel = !MODELS.slice(0, -1).some(
    (m) => m.value === config.model
  );

  return {
    ...config,
    maxCompletionTokens: String(config.maxCompletionTokens),
    temperature: String(config.temperature),
    historyLimit: String(config.historyLimit),
    frequencyPenalty: String(config.frequencyPenalty),
    presencePenalty: String(config.presencePenalty),
    topP: String(config.topP),
    customModel: isCustomModel && config.model !== "custom" ? config.model : "",
    model: isCustomModel && config.model !== "custom" ? "custom" : config.model,
  };
}

// Deserialize FormData to Configuration (strings to numbers)
function deserializeFormData(formData: FormData): Configuration {
  const maxCompletionTokens = parseInt(String(formData.maxCompletionTokens));
  const temperature = parseFloat(String(formData.temperature));
  const historyLimit = parseInt(String(formData.historyLimit));
  const frequencyPenalty = parseFloat(String(formData.frequencyPenalty));
  const presencePenalty = parseFloat(String(formData.presencePenalty));
  const topP = parseFloat(String(formData.topP));

  const { customModel, ...config } = formData;

  return {
    ...config,
    model:
      formData.model === "custom" && customModel ? customModel : formData.model,
    maxCompletionTokens: isNaN(maxCompletionTokens) ? 0 : maxCompletionTokens,
    temperature: isNaN(temperature) ? 0 : temperature,
    historyLimit: isNaN(historyLimit) ? 0 : historyLimit,
    frequencyPenalty: isNaN(frequencyPenalty) ? 0 : frequencyPenalty,
    presencePenalty: isNaN(presencePenalty) ? 0 : presencePenalty,
    topP: isNaN(topP) ? 1 : topP,
  };
}

export function useConfigForm(editingConfig: Configuration | null) {
  const [formData, setFormData] = React.useState<FormData>({
    ...DEFAULT_CONFIG,
  });

  React.useEffect(() => {
    const config = editingConfig
      ? { ...DEFAULT_CONFIG, ...editingConfig }
      : {
          ...DEFAULT_CONFIG,
          id: Date.now().toString(),
        };
    setFormData(serializeConfig(config));
  }, [editingConfig]);

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const field = (name: keyof FormData) => ({
    value: formData[name] ?? "",
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      updateField(name, e.target.value as FormData[typeof name]);
    },
  });

  const toConfig = (): Configuration => {
    return deserializeFormData(formData);
  };

  // Validation using Zod schema
  const isValid = React.useMemo(() => {
    const config = toConfig();
    const result = ConfigurationSchema.safeParse(config);
    return result.success;
  }, [formData]);

  return {
    formData,
    field,
    updateField,
    toConfig,
    isValid,
  };
}
