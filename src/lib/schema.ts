import { z } from "zod";

export const ConfigurationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    active: z.boolean(),
    apiKey: z.string(),
    baseUrl: z.string(),
    model: z.string(),
    maxCompletionTokens: z.number().int().positive(),
    temperature: z.number().min(0).max(2),
    historyLimit: z.number().int().min(2).max(20),
    systemPrompt: z.string(),
    // New fields with defaults for backward compatibility
    frequencyPenalty: z.number().min(-2).max(2).default(0),
    presencePenalty: z.number().min(-2).max(2).default(0),
    topP: z.number().min(0).max(1).default(1),
    toolReadFile: z.boolean().default(true),
    toolListDirectory: z.boolean().default(true),
    toolSearchFiles: z.boolean().default(true),
    toolMaxRounds: z.number().int().min(1).max(10).default(5),
  })
  .loose(); // Allow extra fields for forward compatibility

export function migrateConfig(raw: any): any {
  const migrated = { ...raw };

  // Migrate maxTokens to maxCompletionTokens
  if (migrated.maxTokens && !migrated.maxCompletionTokens) {
    migrated.maxCompletionTokens = migrated.maxTokens;
    console.log(
      `[Config Migration] Migrated maxTokens (${migrated.maxTokens}) to maxCompletionTokens`
    );
  }

  // Remove deprecated fields
  delete migrated.maxTokens;

  return migrated;
}

export function parseImportConfig(raw: unknown): {
  data?: z.infer<typeof ConfigurationSchema>;
  error?: string;
} {
  try {
    // Step 1: Migrate old format
    const migrated = migrateConfig(raw);

    // Step 2: Parse with defaults applied
    const result = ConfigurationSchema.safeParse(migrated);

    if (!result.success) {
      const errorMessages = result.error.issues
        .map((e: any) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return {
        error: `Invalid configuration: ${errorMessages}`,
      };
    }
    return {
      data: result.data,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}

export function cleanExportConfig(config: z.infer<typeof ConfigurationSchema>) {
  const cleaned: any = {};
  const knownKeys = Object.keys(ConfigurationSchema.shape);

  for (const key of knownKeys) {
    if (key in config) {
      cleaned[key] = key === "apiKey" ? "" : (config as any)[key];
    }
  }

  return cleaned;
}

export function validateConfigStrict(
  config: unknown
): z.infer<typeof ConfigurationSchema> {
  return ConfigurationSchema.parse(config);
}
