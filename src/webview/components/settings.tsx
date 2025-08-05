import * as React from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  IconButton,
} from "@radix-ui/themes";
import { useChatStore } from "../store";
import { Configuration } from "../../types";

export const Settings: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const config = useChatStore((state) => state.config);
  const saveConfig = useChatStore((state) => state.saveConfig);

  const [formData, setFormData] = React.useState<Configuration>({
    apiKey: "",
    baseUrl: "",
    model: "",
    maxTokens: 8000,
    temperature: 0.1,
    historyLimit: 10,
  });

  React.useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = () => {
    saveConfig(formData);
    setOpen(false);
  };

  const handleInputChange =
    (field: keyof Configuration) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: field === 'maxTokens' || field === 'historyLimit' 
          ? parseInt(value) || 0
          : field === 'temperature'
          ? parseFloat(value) || 0
          : value,
      }));
    };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Flex direction="row" align="center" justify="end" px="3" pt="3" pb="0">
          <Button size="1" color="gray" variant="ghost">
            {config?.model ?? "set model"}
          </Button>
        </Flex>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Configuration</Dialog.Title>

        <Flex direction="column" gap="3">
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
              placeholder="https://api.example.com/v1"
              value={formData.baseUrl}
              onChange={handleInputChange("baseUrl")}
            />
          </label>

          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Model
            </Text>
            <TextField.Root
              placeholder="llama3"
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
          <Button onClick={handleSave}>Save</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
