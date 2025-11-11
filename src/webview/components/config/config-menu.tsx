import * as React from "react";
import { Button, Flex, DropdownMenu, IconButton } from "@radix-ui/themes";
import {
  MixerHorizontalIcon,
  TrashIcon,
  CaretDownIcon,
} from "@radix-ui/react-icons";
import { useChatConfig } from "@/hooks/useChatConfig";
import { Configuration } from "@/lib/types";
import { parseImportConfig, validateConfigStrict } from "@/lib/schema";
import { ConfigDialog } from "./config-dialog";
import { DeleteConfigDialog } from "./delete-config-dialog";
import "./config.css";

export const ConfigMenu: React.FC = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] =
    React.useState<Configuration | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [configToDelete, setConfigToDelete] =
    React.useState<Configuration | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { configs, activeConfig, saveConfigs, exportConfig } = useChatConfig();

  const handleConfigChange = (value: string) => {
    if (value === "add-new") {
      setEditingConfig(null);
      setDialogOpen(true);
      return;
    }

    if (value === "import-config") {
      fileInputRef.current?.click();
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

  const handleSave = (finalFormData: Configuration) => {
    try {
      const validatedConfig = validateConfigStrict(finalFormData);

      if (editingConfig) {
        // Update existing config
        const updatedConfigs = configs.map((c) =>
          c.id === validatedConfig.id ? validatedConfig : c
        );
        saveConfigs(updatedConfigs);
      } else {
        // Add new config
        const updatedConfigs = configs.map((c) => ({ ...c, active: false }));
        updatedConfigs.push({ ...validatedConfig, active: true });
        saveConfigs(updatedConfigs);
      }
      setDialogOpen(false);
      setEditingConfig(null);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleExport = (config: Configuration) => {
    exportConfig(config);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rawConfig = JSON.parse(content);
        const result = parseImportConfig(rawConfig);

        if (result.error) {
          throw new Error(result.error);
        }

        // Create new config and set as active
        const newConfig: Configuration = {
          ...result.data!,
          id: Date.now().toString(),
          active: true,
        };

        // Deactivate other configs
        const updatedConfigs = configs.map((c) => ({ ...c, active: false }));
        updatedConfigs.push(newConfig);
        saveConfigs(updatedConfigs);
      } catch (error) {
        alert(
          `Failed to import config: ${
            error instanceof Error ? error.message : "invalid JSON file"
          }`
        );
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be imported again
    event.target.value = "";
  };

  return (
    <>
      {configs.length === 0 ? (
        <Button
          variant="soft"
          size="1"
          onClick={() => handleConfigChange("add-new")}
        >
          <CaretDownIcon />
          Add config
        </Button>
      ) : (
        <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenu.Trigger>
            <Button variant="soft" color="gray" size="1">
              <CaretDownIcon />
              <div className="config-name">
                {activeConfig?.name || "Select config"}
              </div>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            size="2"
            variant="soft"
            color="gray"
            style={{ width: 180 }}
          >
            {configs.map((config) => (
              <DropdownMenu.Item
                key={config.id}
                onClick={() => handleConfigChange(config.id)}
                className="config-menu-item"
              >
                <Flex align="center" justify="between" width="100%" gap="2">
                  <div className="config-name">{config.name}</div>
                  <Flex mr="-1" gap="2" className="config-actions">
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      radius="full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditConfig(config);
                      }}
                      aria-label="Edit config"
                    >
                      <MixerHorizontalIcon />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      radius="full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConfig(config);
                      }}
                      aria-label="Delete config"
                    >
                      <TrashIcon />
                    </IconButton>
                  </Flex>
                </Flex>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onClick={() => handleConfigChange("add-new")}
              color="gray"
            >
              <Flex align="center" width="100%" gap="2">
                New config
              </Flex>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => handleConfigChange("import-config")}
              color="gray"
            >
              <Flex align="center" width="100%" gap="2">
                Import
              </Flex>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleImportConfig}
      />

      <ConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingConfig={editingConfig}
        onSave={handleSave}
        onExport={handleExport}
      />

      <DeleteConfigDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        config={configToDelete}
        onConfirm={confirmDelete}
      />
    </>
  );
};
