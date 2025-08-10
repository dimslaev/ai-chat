import * as React from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  DropdownMenu,
} from "@radix-ui/themes";
import {
  MixerHorizontalIcon,
  PlusIcon,
  TrashIcon,
  CaretDownIcon,
} from "@radix-ui/react-icons";
import { useChatStore } from "../store";
import { Configuration } from "../../types";

export const Settings: React.FC = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] =
    React.useState<Configuration | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [configToDelete, setConfigToDelete] =
    React.useState<Configuration | null>(null);
  const configs = useChatStore((state) => state.configs);
  const saveConfigs = useChatStore((state) => state.saveConfigs);

  const activeConfig = configs.find((c) => c.active);

  const [formData, setFormData] = React.useState<Configuration>({
    id: "",
    name: "",
    active: false,
    apiKey: "",
    baseUrl: "",
    model: "",
    maxTokens: 8000,
    temperature: 0.1,
    historyLimit: 10,
  });

  React.useEffect(() => {
    if (editingConfig) {
      setFormData(editingConfig);
    } else {
      setFormData({
        id: Date.now().toString(),
        name: "",
        active: false,
        apiKey: "",
        baseUrl: "",
        model: "",
        maxTokens: 8000,
        temperature: 0.1,
        historyLimit: 10,
      });
    }
  }, [editingConfig, configs.length]);

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
    if (editingConfig) {
      // Update existing config
      const updatedConfigs = configs.map((c) =>
        c.id === formData.id ? formData : c
      );
      saveConfigs(updatedConfigs);
    } else {
      // Add new config
      const updatedConfigs = configs.map((c) => ({ ...c, active: false }));
      updatedConfigs.push({ ...formData, active: true });
      saveConfigs(updatedConfigs);
    }
    setDialogOpen(false);
    setEditingConfig(null);
  };

  const handleInputChange =
    (field: keyof Configuration) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]:
          field === "maxTokens" || field === "historyLimit"
            ? parseInt(value) || 0
            : field === "temperature"
            ? parseFloat(value) || 0
            : value,
      }));
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
          Model
        </Button>
      ) : (
        <DropdownMenu.Root>
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
                Add new
              </Flex>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>
            {editingConfig ? "Edit Model" : "Add Model"}
          </Dialog.Title>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Name
              </Text>
              <TextField.Root
                placeholder="Display Name"
                value={formData.name}
                onChange={handleInputChange("name")}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                API Key
              </Text>
              <TextField.Root
                type="password"
                placeholder="Enter API key"
                value={formData.apiKey}
                onChange={handleInputChange("apiKey")}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Base URL
              </Text>
              <TextField.Root
                placeholder="https://api.infomaniak.com/1/ai/[PRODUCT_ID]/openai"
                value={formData.baseUrl}
                onChange={handleInputChange("baseUrl")}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Model - qwen3 | mistral24b | mistral3
              </Text>
              <TextField.Root
                placeholder="mistral24b"
                value={formData.model}
                onChange={handleInputChange("model")}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Max Tokens
              </Text>
              <TextField.Root
                type="number"
                placeholder="8000"
                value={formData.maxTokens.toString()}
                onChange={handleInputChange("maxTokens")}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Temperature
              </Text>
              <TextField.Root
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="0.1"
                value={formData.temperature.toString()}
                onChange={handleInputChange("temperature")}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                History Limit
              </Text>
              <TextField.Root
                type="number"
                placeholder="10"
                value={formData.historyLimit.toString()}
                onChange={handleInputChange("historyLimit")}
              />
            </label>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
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
