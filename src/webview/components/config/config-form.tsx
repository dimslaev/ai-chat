import * as React from "react";
import { Flex, Text, TextField, Select, Separator } from "@radix-ui/themes";
import TextareaAutosize from "react-textarea-autosize";
import { DEFAULT_BASE_URL, MODELS } from "@/lib/config";
import { FormData } from "@/hooks/useConfigForm";

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
  grow?: boolean;
}> = ({ label, children, grow }) => (
  <label style={grow ? { flex: 1 } : undefined}>
    <Text as="div" size="2" mb="1" weight="bold">
      {label}
    </Text>
    {children}
  </label>
);

interface ConfigFormProps {
  formData: FormData;
  field: (
    name: keyof FormData,
    parser?: (v: string) => any
  ) => {
    value: any;
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void;
  };
  updateField: (field: string, value: string) => void;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({
  formData,
  field,
  updateField,
}) => {
  return (
    <Flex
      direction="column"
      gap="3"
      p="4"
      flexGrow="1"
      style={{
        maxWidth: 500,
        overflowY: "auto",
      }}
    >
      <FormField label="Name">
        <TextField.Root placeholder="Display Name" {...field("name")} />
      </FormField>

      <FormField label="API Key">
        <TextField.Root
          type="password"
          placeholder="Enter API key"
          {...field("apiKey")}
        />
      </FormField>

      <FormField label="Base URL">
        <TextField.Root placeholder={DEFAULT_BASE_URL} {...field("baseUrl")} />
      </FormField>

      <FormField label="Model">
        <Select.Root
          value={formData.model}
          onValueChange={(value) => {
            updateField("model", value);
            if (value !== "custom") updateField("customModel", "");
          }}
        >
          <Select.Trigger placeholder="Select a model" />
          <Select.Content>
            {MODELS.map((model) => (
              <Select.Item key={model.value} value={model.value}>
                {model.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </FormField>

      {formData.model === "custom" && (
        <FormField label="Custom Model Name">
          <TextField.Root
            placeholder="Enter custom model name"
            {...field("customModel")}
          />
        </FormField>
      )}

      <Separator size="4" my="2" style={{ flexShrink: 0 }} />

      <FormField label="System Prompt">
        <TextareaAutosize
          placeholder="Use this field to set a custom system prompt"
          minRows={3}
          maxRows={15}
          className="chat-textarea chat-textarea-settings"
          {...field("systemPrompt")}
        />
      </FormField>

      <Flex direction="row" gap="3">
        <FormField label="Max Completion Tokens" grow>
          <TextField.Root
            type="number"
            min="0"
            max="100000"
            step="1000"
            placeholder="8000"
            {...field("maxCompletionTokens")}
          />
        </FormField>

        <FormField label="Temperature" grow>
          <TextField.Root
            type="number"
            step="0.1"
            min="0"
            max="2"
            placeholder="0.1"
            {...field("temperature")}
          />
        </FormField>
      </Flex>

      <Flex direction="row" gap="3">
        <FormField label="History Limit" grow>
          <TextField.Root
            type="number"
            min="2"
            max="40"
            step="1"
            placeholder="10"
            {...field("historyLimit")}
          />
        </FormField>

        <FormField label="Frequency Penalty" grow>
          <TextField.Root
            type="number"
            step="0.1"
            min="-2"
            max="2"
            placeholder="0"
            {...field("frequencyPenalty")}
          />
        </FormField>
      </Flex>

      <Flex direction="row" gap="3">
        <FormField label="Presence Penalty" grow>
          <TextField.Root
            type="number"
            step="0.1"
            min="-2"
            max="2"
            placeholder="0"
            {...field("presencePenalty")}
          />
        </FormField>

        <FormField label="Top P" grow>
          <TextField.Root
            type="number"
            step="0.1"
            min="0"
            max="1"
            placeholder="1"
            {...field("topP")}
          />
        </FormField>
      </Flex>
    </Flex>
  );
};
