import * as React from "react";
import {
  Flex,
  Text,
  TextField,
  Select,
  Separator,
  Button,
  Link,
} from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import TextareaAutosize from "react-textarea-autosize";
import { CONFIG_TEMPLATES } from "@/lib/templates";
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
  isEditing?: boolean;
  onExport?: () => void;
  onDelete?: () => void;
  isValid?: boolean;
  selectedTemplate?: string;
  onTemplateChange?: (templateId: string) => void;
  templateInfoUrl?: string;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({
  formData,
  field,
  isEditing = false,
  onExport,
  onDelete,
  isValid = true,
  selectedTemplate = "blank",
  onTemplateChange,
  templateInfoUrl,
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
      {!isEditing && onTemplateChange && (
        <FormField label="Template">
          <Select.Root
            value={selectedTemplate}
            onValueChange={onTemplateChange}
          >
            <Select.Trigger placeholder="Choose a starting template" />
            <Select.Content>
              {CONFIG_TEMPLATES.map((template) => (
                <Select.Item key={template.id} value={template.id}>
                  {template.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </FormField>
      )}

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
        <TextField.Root
          placeholder="e.g., https://api.example.com/v1"
          {...field("baseUrl")}
        />
      </FormField>

      <FormField label="Model">
        <TextField.Root
          placeholder="e.g., qwen3, qwen2.5-coder:7b"
          {...field("model")}
        />
        {templateInfoUrl && (
          <Link
            href={templateInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="1"
            color="gray"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "4px",
            }}
          >
            <InfoCircledIcon style={{ width: 12, height: 12 }} />
            More information
          </Link>
        )}
      </FormField>

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

      {isEditing && (
        <>
          <Separator size="4" mt="2" mb="3" style={{ flexShrink: 0 }} />
          <Flex direction="column" gap="5">
            {onExport && (
              <Flex gap="4" align="center" wrap="wrap">
                <Button
                  variant="surface"
                  color="gray"
                  onClick={onExport}
                  disabled={!isValid}
                  style={{ width: "fit-content" }}
                >
                  Export Config
                </Button>
                <Text size="2" color="gray">
                  Export this configuration as a JSON file
                </Text>
              </Flex>
            )}

            {onDelete && (
              <Flex gap="4" align="center" wrap="wrap">
                <Button
                  variant="surface"
                  color="gray"
                  onClick={onDelete}
                  style={{ width: "fit-content" }}
                >
                  Delete Config
                </Button>
                <Text size="2" color="gray">
                  Permanently delete this configuration
                </Text>
              </Flex>
            )}
          </Flex>
        </>
      )}
    </Flex>
  );
};
