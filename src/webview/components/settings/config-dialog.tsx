import * as React from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  Select,
  Separator,
} from "@radix-ui/themes";
import TextareaAutosize from "react-textarea-autosize";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Configuration } from "../../../lib/types";
import { DEFAULT_BASE_URL, DEFAULT_CONFIG, MODELS } from "../../../lib/config";

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label>
    <Text as="div" size="2" mb="1" weight="bold">
      {label}
    </Text>
    {children}
  </label>
);

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingConfig: Configuration | null;
  onSave: (config: Configuration) => void;
}

export const ConfigDialog: React.FC<ConfigDialogProps> = ({
  open,
  onOpenChange,
  editingConfig,
  onSave,
}) => {
  const [formData, setFormData] = React.useState<Configuration>({
    ...DEFAULT_CONFIG,
  });
  const [customModel, setCustomModel] = React.useState("");

  React.useEffect(() => {
    const config = editingConfig || {
      ...DEFAULT_CONFIG,
      id: Date.now().toString(),
    };
    setFormData(config);

    // Check if the model is a custom one (not in the predefined list)
    const isCustomModel = !MODELS.slice(0, -1).some(
      (m) => m.value === config.model
    );
    if (isCustomModel && config.model !== "custom") {
      setCustomModel(config.model);
    } else {
      setCustomModel("");
    }
  }, [editingConfig]);

  const updateFormData = <K extends keyof Configuration>(
    field: K,
    value: Configuration[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange =
    (field: keyof Configuration) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const parsedValue =
        field === "maxTokens" || field === "historyLimit"
          ? parseInt(value) || 0
          : field === "temperature"
          ? parseFloat(value) || 0
          : value;
      updateFormData(field, parsedValue as Configuration[typeof field]);
    };

  const handleSave = () => {
    // Use custom model if "custom" is selected and customModel is provided
    const finalFormData = {
      ...formData,
      model:
        formData.model === "custom" && customModel
          ? customModel
          : formData.model,
    };
    onSave(finalFormData);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{
          width: "100vw",
          height: "100vh",
          maxWidth: "100vw",
          maxHeight: "100vh",
          padding: 0,
          position: "fixed",
          top: 0,
          left: 0,
          margin: 0,
          borderRadius: 0,
          border: "none",
          display: "flex",
          flexDirection: "column",
          animation: "none",
        }}
      >
        <Flex
          direction="row"
          justify="between"
          align="center"
          p="4"
          style={{
            borderBottom: "1px solid var(--gray-6)",
          }}
        >
          <Dialog.Title mb="0">
            {editingConfig ? "Edit config" : "Add config"}
          </Dialog.Title>
          <Dialog.Close>
            <Button variant="ghost" color="gray" size="1" tabIndex={-1}>
              <Cross2Icon />
            </Button>
          </Dialog.Close>
        </Flex>

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
            <TextField.Root
              placeholder="Display Name"
              value={formData.name}
              onChange={handleInputChange("name")}
            />
          </FormField>

          <FormField label="API Key">
            <TextField.Root
              type="password"
              placeholder="Enter API key"
              value={formData.apiKey}
              onChange={handleInputChange("apiKey")}
            />
          </FormField>

          <FormField label="Base URL">
            <TextField.Root
              placeholder={DEFAULT_BASE_URL}
              value={formData.baseUrl}
              onChange={handleInputChange("baseUrl")}
            />
          </FormField>

          <FormField label="Model">
            <Select.Root
              value={
                MODELS.some((m) => m.value === formData.model)
                  ? formData.model
                  : "custom"
              }
              onValueChange={(value) => {
                updateFormData("model", value);
                if (value !== "custom") {
                  setCustomModel("");
                }
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

          {(formData.model === "custom" ||
            !MODELS.some((m) => m.value === formData.model)) && (
            <FormField label="Custom Model Name">
              <TextField.Root
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
              />
            </FormField>
          )}

          <Separator size="4" my="2" />

          <FormField label="System Prompt">
            <TextareaAutosize
              placeholder="Use this field to set a custom system prompt"
              value={formData.systemPrompt || ""}
              onChange={(e) => updateFormData("systemPrompt", e.target.value)}
              minRows={3}
              className="chat-textarea chat-textarea-settings"
            />
          </FormField>

          <FormField label="Max Tokens">
            <TextField.Root
              type="number"
              placeholder="8000"
              value={formData.maxTokens.toString()}
              onChange={handleInputChange("maxTokens")}
            />
          </FormField>

          <FormField label="Temperature">
            <TextField.Root
              type="number"
              step="0.1"
              min="0"
              max="2"
              placeholder="0.1"
              value={formData.temperature.toString()}
              onChange={handleInputChange("temperature")}
            />
          </FormField>

          <FormField label="History Limit">
            <TextField.Root
              type="number"
              placeholder="10"
              value={formData.historyLimit.toString()}
              onChange={handleInputChange("historyLimit")}
            />
          </FormField>
        </Flex>

        <Flex
          gap="3"
          p="4"
          justify="end"
          style={{
            borderTop: "1px solid var(--gray-6)",
          }}
        >
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleSave}>
            {editingConfig ? "Update" : "Add"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
