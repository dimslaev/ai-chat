import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import {
  Button,
  Callout,
  Checkbox,
  Flex,
  Link,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";

import { FormData } from "@/hooks/use-config-form";
import { MCP_TOOLS } from "@/lib/config";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { CONFIG_TEMPLATES } from "@/lib/templates";

type FieldProps = {
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

interface ConfigFormProps {
  formData: FormData;
  field: (name: keyof FormData) => FieldProps;
  updateField: (field: string, value: any) => void;
  isEditing?: boolean;
  onExport?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isValid?: boolean;
  validationErrors?: string[];
  selectedTemplate?: string;
  onTemplateChange?: (templateId: string) => void;
  templateInfoUrl?: string;
}

export function ConfigForm({
  formData,
  field,
  updateField,
  isEditing = false,
  onExport,
  onDelete,
  onDuplicate,
  isValid = true,
  validationErrors = [],
  selectedTemplate = "blank",
  onTemplateChange,
  templateInfoUrl,
}: ConfigFormProps) {
  return (
    <Flex
      direction="column"
      gap="3"
      p="4"
      flexGrow="1"
      style={{ maxWidth: 500, overflowY: "auto" }}
    >
      {!isEditing && onTemplateChange && (
        <TemplateSection
          selectedTemplate={selectedTemplate}
          onTemplateChange={onTemplateChange}
        />
      )}

      <ValidationErrors errors={validationErrors} />

      <BasicFieldsSection field={field} templateInfoUrl={templateInfoUrl} />

      <PromptSection field={field} />

      <Separator size="4" my="2" style={{ flexShrink: 0 }} />

      <MCPSection formData={formData} field={field} updateField={updateField} />

      {isEditing && (
        <ConfigActionsSection
          onDuplicate={onDuplicate}
          onExport={onExport}
          onDelete={onDelete}
          isValid={isValid}
        />
      )}
    </Flex>
  );
}

function FormField({
  label,
  children,
  grow,
}: {
  label: string;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <label style={grow ? { flex: 1 } : undefined}>
      <Text as="div" size="2" mb="1" weight="bold">
        {label}
      </Text>
      {children}
    </label>
  );
}

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details>
      <summary
        style={{
          cursor: "pointer",
          fontSize: 12,
          color: "var(--gray-11)",
          userSelect: "none",
        }}
      >
        {title}
      </summary>
      <Flex direction="column" gap="3" mt="3">
        {children}
      </Flex>
    </details>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      gap="2"
      wrap="wrap"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      }}
    >
      {children}
    </Flex>
  );
}

function TemplateSection({
  selectedTemplate,
  onTemplateChange,
}: {
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
}) {
  return (
    <FormField label="Template">
      <Select.Root value={selectedTemplate} onValueChange={onTemplateChange}>
        <Select.Trigger placeholder="Choose a starting template" />
        <Select.Content>
          {CONFIG_TEMPLATES.map((t) => (
            <Select.Item key={t.id} value={t.id}>{t.label}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </FormField>
  );
}

function ValidationErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <Callout.Root color="red" size="1">
      <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
      <Callout.Text>
        {errors.map((error, i) => <div key={i}>{error}</div>)}
      </Callout.Text>
    </Callout.Root>
  );
}

function BasicFieldsSection({
  field,
  templateInfoUrl,
}: {
  field: (name: keyof FormData) => FieldProps;
  templateInfoUrl?: string;
}) {
  return (
    <>
      <FormField label="Name">
        <TextField.Root placeholder="Display Name" {...field("name")} />
      </FormField>

      <FormField label="API Key">
        <TextField.Root type="password" placeholder="Enter API key" {...field("apiKey")} />
      </FormField>

      <FormField label="Base URL">
        <TextField.Root placeholder="e.g., https://api.example.com/v1" {...field("baseUrl")} />
      </FormField>

      <FormField label="Model">
        <TextField.Root placeholder="e.g., qwen3, qwen2.5-coder:7b" {...field("model")} />
        {templateInfoUrl && (
          <Link
            href={templateInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="1"
            color="gray"
            style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}
          >
            <InfoCircledIcon style={{ width: 12, height: 12 }} />
            More information
          </Link>
        )}
      </FormField>
    </>
  );
}

type NumericFieldConfig = {
  name: keyof FormData;
  label: string;
  min: number;
  max: number;
  step: number;
  placeholder: string;
};

const ADVANCED_FIELDS: NumericFieldConfig[] = [
  { name: "maxCompletionTokens", label: "Max Tokens", min: 0, max: 100000, step: 1000, placeholder: "8000" },
  { name: "temperature", label: "Temperature", min: 0, max: 2, step: 0.1, placeholder: "0.1" },
  { name: "frequencyPenalty", label: "Frequency Penalty", min: -2, max: 2, step: 0.1, placeholder: "0" },
  { name: "presencePenalty", label: "Presence Penalty", min: -2, max: 2, step: 0.1, placeholder: "0" },
  { name: "topP", label: "Top P", min: 0, max: 1, step: 0.1, placeholder: "1" },
  { name: "historyLimit", label: "History Limit", min: 2, max: 40, step: 1, placeholder: "10" },
];

function PromptSection({ field }: { field: (name: keyof FormData) => FieldProps }) {
  return (
    <Flex direction="column" gap="1">
      <FormField label="System Prompt">
        <TextareaAutosize
          placeholder={SYSTEM_PROMPT}
          minRows={3}
          maxRows={5}
          className="chat-textarea chat-textarea-settings"
          {...field("systemPrompt")}
        />
      </FormField>

      <CollapsibleSection title="Advanced">
        <FieldGrid>
          {ADVANCED_FIELDS.map((f) => (
            <FormField key={f.name} label={f.label} grow>
              <TextField.Root
                type="number"
                min={f.min}
                max={f.max}
                step={f.step}
                placeholder={f.placeholder}
                {...field(f.name)}
              />
            </FormField>
          ))}
        </FieldGrid>
      </CollapsibleSection>
    </Flex>
  );
}

function MCPSection({
  formData,
  field,
  updateField,
}: {
  formData: FormData;
  field: (name: keyof FormData) => FieldProps;
  updateField: (field: string, value: any) => void;
}) {
  return (
    <Flex direction="column" gap="1">
      <Flex align="center" gap="2">
        <Text as="div" size="2" weight="bold">VS Code MCP Server</Text>
        <Link
          href="https://github.com/juehang/vscode-mcp-server"
          target="_blank"
          rel="noopener noreferrer"
          size="1"
          color="gray"
        >
          <InfoCircledIcon style={{ width: 12, height: 12 }} />
        </Link>
      </Flex>

      <TextField.Root
        placeholder="http://localhost:3000/mcp"
        value={formData.mcpServers?.[0]?.url || ""}
        onChange={(e) => {
          const url = e.target.value;
          updateField("mcpServers", url ? [{ id: "default", name: "MCP Server", url }] : []);
        }}
      />

      <CollapsibleSection title={`Tools (${formData.mcpEnabledTools?.length || 0}/${MCP_TOOLS.length})`}>
        <Flex gap="2" align="center">
          <Text as="label" size="2">Step delay (ms):</Text>
          <TextField.Root
            type="number"
            min="0"
            max="10000"
            step="100"
            placeholder="1000"
            {...field("stepDelay")}
            style={{ paddingRight: 6 }}
          />
        </Flex>

        <FieldGrid>
          {MCP_TOOLS.map((tool) => (
            <Text as="label" size="2" key={tool.id}>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={formData.mcpEnabledTools?.includes(tool.id)}
                  onCheckedChange={(checked) => {
                    const current = formData.mcpEnabledTools || [];
                    updateField(
                      "mcpEnabledTools",
                      checked ? [...current, tool.id] : current.filter((t) => t !== tool.id),
                    );
                  }}
                />
                {tool.label}
              </Flex>
            </Text>
          ))}
        </FieldGrid>
      </CollapsibleSection>
    </Flex>
  );
}

type ConfigAction = {
  key: string;
  label: string;
  desc: string;
  handler?: () => void;
  disabled: boolean;
};

function ConfigActionsSection({
  onDuplicate,
  onExport,
  onDelete,
  isValid,
}: {
  onDuplicate?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  isValid: boolean;
}) {
  const actions: ConfigAction[] = [
    { key: "duplicate", label: "Duplicate", desc: "Create a copy of this configuration", handler: onDuplicate, disabled: !isValid },
    { key: "export", label: "Export", desc: "Export this configuration as a JSON file", handler: onExport, disabled: !isValid },
    { key: "delete", label: "Delete", desc: "Permanently delete this configuration", handler: onDelete, disabled: false },
  ].filter((a) => a.handler);

  if (actions.length === 0) return null;

  return (
    <>
      <Separator size="4" my="2" style={{ flexShrink: 0 }} />
      <Text size="2" mb="1" weight="bold">Config options</Text>
      <Flex direction="column" gap="4">
        {actions.map((action) => (
          <Flex key={action.key} gap="4" align="center" wrap="wrap">
            <Button
              variant="surface"
              color="gray"
              onClick={action.handler}
              disabled={action.disabled}
              style={{ width: 80 }}
            >
              {action.label}
            </Button>
            <Text size="2" color="gray">{action.desc}</Text>
          </Flex>
        ))}
      </Flex>
    </>
  );
}
