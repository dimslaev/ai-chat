import * as React from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  DropdownMenu,
  Checkbox,
  Select,
  Separator,
} from "@radix-ui/themes";
import TextareaAutosize from "react-textarea-autosize";
import {
  MixerHorizontalIcon,
  PlusIcon,
  TrashIcon,
  CaretDownIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { useChatStore } from "../store";
import { useChatConfig } from "../hooks";
import { Configuration } from "../../lib/types";
import { DEFAULT_BASE_URL, DEFAULT_CONFIG, MODELS } from "../../lib/config";

const TEXTAREA_STYLES = {
  width: "100%",
  padding: "8px",
  borderRadius: "var(--radius-2)",
  border: "1px solid var(--gray-6)",
  backgroundColor: "var(--color-surface)",
  color: "var(--gray-12)",
  fontFamily: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  resize: "none" as const,
  boxSizing: "border-box" as const,
};

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

export const Settings: React.FC = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] =
    React.useState<Configuration | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [configToDelete, setConfigToDelete] =
    React.useState<Configuration | null>(null);
  const [customModel, setCustomModel] = React.useState("");
  const configs = useChatStore((state) => state.configs);

  const { saveConfigs } = useChatConfig();

  const activeConfig = configs.find((c) => c.active);

  const [formData, setFormData] = React.useState<Configuration>({
    ...DEFAULT_CONFIG,
    id: "",
  });

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
  }, [editingConfig, configs.length]);

  const updateFormData = <K extends keyof Configuration>(
    field: K,
    value: Configuration[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (value: string) => {
    if (value === "add-new") {
      setEditingConfig(null);
      setDialogOpen(true);
      return;
    }

    const updatedConfigs = configs.map((c) => ({
      ...c,
      active: c.id === value,
    }));
    saveConfigs(updatedConfigs);
  };

  const handleEditConfig = (config: Configuration) => {
    setEditingConfig(config);
    setDropdownOpen(false);
    setDialogOpen(true);
  };

  const handleDeleteConfig = (config: Configuration) => {
    setConfigToDelete(config);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!configToDelete) return;

    const updatedConfigs = configs.filter((c) => c.id !== configToDelete.id);
    if (updatedConfigs.length > 0 && !updatedConfigs.some((c) => c.active)) {
      updatedConfigs[0].active = true;
    }
    saveConfigs(updatedConfigs);
    setDeleteConfirmOpen(false);
    setConfigToDelete(null);
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

    if (editingConfig) {
      // Update existing config
      const updatedConfigs = configs.map((c) =>
        c.id === finalFormData.id ? finalFormData : c
      );
      saveConfigs(updatedConfigs);
    } else {
      // Add new config
      const updatedConfigs = configs.map((c) => ({ ...c, active: false }));
      updatedConfigs.push({ ...finalFormData, active: true });
      saveConfigs(updatedConfigs);
    }
    setDialogOpen(false);
    setEditingConfig(null);
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

  return (
    <Flex direction="row" align="center" px="3" pt="3" pb="0" gap="2">
      {configs.length === 0 ? (
        <Button
          variant="ghost"
          size="1"
          onClick={() => handleConfigChange("add-new")}
        >
          <CaretDownIcon />
          Add model config
        </Button>
      ) : (
        <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenu.Trigger>
            <Button variant="outline" color="gray" size="1">
              <CaretDownIcon />
              {activeConfig?.name || "Select model"}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size="1" style={{ width: 160 }}>
            {configs.map((config) => (
              <DropdownMenu.Item
                key={config.id}
                onClick={() => handleConfigChange(config.id)}
                color="gray"
              >
                <Flex align="center" justify="between" width="100%">
                  <Text>{config.name}</Text>
                  <Flex gap="2">
                    <MixerHorizontalIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditConfig(config);
                      }}
                    />
                    <TrashIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConfig(config);
                      }}
                    />
                  </Flex>
                </Flex>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onClick={() => handleConfigChange("add-new")}
              color="gray"
            >
              <Flex align="end" gap="2">
                <PlusIcon />
                Add new config
              </Flex>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <Dialog.Title style={{ margin: 0 }}>
              {editingConfig ? "Edit Model" : "Add Model"}
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
            style={{
              maxWidth: 500,
              flex: 1,
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

            <FormField label="System Prompt (Optional)">
              <TextareaAutosize
                placeholder="Additional instructions to append to the default system prompt..."
                value={formData.systemPrompt || ""}
                onChange={(e) => updateFormData("systemPrompt", e.target.value)}
                minRows={3}
                style={TEXTAREA_STYLES}
              />
            </FormField>

            <label>
              <Flex align="center" gap="2">
                <Checkbox
                  checked={formData.replaceSystemPrompt || false}
                  onCheckedChange={(checked) =>
                    updateFormData("replaceSystemPrompt", checked === true)
                  }
                />
                <Text size="2">
                  Replace system prompt (instead of appending)
                </Text>
              </Flex>
            </label>

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

      <Dialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Dialog.Content style={{ maxWidth: 350 }}>
          <Dialog.Title>Delete Model</Dialog.Title>
          <Text>
            Are you sure you want to delete "{configToDelete?.name}"? This
            action cannot be undone.
          </Text>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={confirmDelete} color="red">
              Delete
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
};
