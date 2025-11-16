import * as React from "react";
import { Configuration } from "@/lib/types";
import { DEFAULT_CONFIG } from "@/lib/config";
import { ConfigurationSchema } from "@/lib/schema";
import { CONFIG_TEMPLATES } from "@/lib/templates";

type StringifyNumbers<T> = {
  [K in keyof T]: T[K] extends number ? string | number : T[K];
};
export type FormData = StringifyNumbers<Configuration>;

function serializeConfig(config: Configuration): FormData {
  return {
    ...config,
    maxCompletionTokens: String(config.maxCompletionTokens),
    temperature: String(config.temperature),
    historyLimit: String(config.historyLimit),
    frequencyPenalty: String(config.frequencyPenalty),
    presencePenalty: String(config.presencePenalty),
    topP: String(config.topP),
  };
}

function deserializeFormData(formData: FormData): Configuration {
  const maxCompletionTokens = parseInt(String(formData.maxCompletionTokens));
  const temperature = parseFloat(String(formData.temperature));
  const historyLimit = parseInt(String(formData.historyLimit));
  const frequencyPenalty = parseFloat(String(formData.frequencyPenalty));
  const presencePenalty = parseFloat(String(formData.presencePenalty));
  const topP = parseFloat(String(formData.topP));

  return {
    ...formData,
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
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<string>("blank");
  const [templateInfoUrl, setTemplateInfoUrl] = React.useState<string>("");

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

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = CONFIG_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setTemplateInfoUrl(template.infoUrl || "");
      setFormData((prev) => ({
        ...serializeConfig(template.template as Configuration),
        id: prev.id,
        name: prev.name,
        active: prev.active,
      }));
    }
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
    selectedTemplate,
    applyTemplate,
    templateInfoUrl,
  };
}
