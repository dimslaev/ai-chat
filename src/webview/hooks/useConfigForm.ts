import * as React from "react";
import { Configuration } from "@/lib/types";
import { DEFAULT_CONFIG, MODELS } from "@/lib/config";
import { ConfigurationSchema } from "@/lib/schema";

type FormData = Configuration & { customModel?: string };

export function useConfigForm(editingConfig: Configuration | null) {
  const [formData, setFormData] = React.useState<FormData>({
    ...DEFAULT_CONFIG,
  });

  React.useEffect(() => {
    const config = editingConfig || {
      ...DEFAULT_CONFIG,
      id: Date.now().toString(),
    };

    // Check if model is custom (not in predefined list)
    const isCustomModel = !MODELS.slice(0, -1).some(
      (m) => m.value === config.model
    );

    setFormData({
      ...DEFAULT_CONFIG,
      ...config,
      customModel:
        isCustomModel && config.model !== "custom" ? config.model : "",
      model:
        isCustomModel && config.model !== "custom" ? "custom" : config.model,
    });
  }, [editingConfig]);

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const field = (name: keyof FormData, parser?: (v: string) => any) => ({
    value: formData[name] as any,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const value = parser ? parser(e.target.value) : e.target.value;
      updateField(name, value as any);
    },
  });

  const toConfig = (): Configuration => {
    const { customModel, ...config } = formData;
    return {
      ...config,
      model:
        config.model === "custom" && customModel ? customModel : config.model,
    };
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
