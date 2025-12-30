import { CaretDownIcon } from "@radix-ui/react-icons";
import { Button, DropdownMenu, Flex } from "@radix-ui/themes";
import * as React from "react";

import { ConfigDialog } from "@/components/config/config-dialog";
import { ConfigMenuItem } from "@/components/config/config-menu-item";
import { DeleteConfigDialog } from "@/components/config/delete-config-dialog";
import { TextEllipsis } from "@/components/ui/text-ellipsis";
import { useChatConfig } from "@/hooks/use-chat-config";
import { Configuration } from "@/lib/types";

export interface ConfigMenuRef {
  openDropdown: () => void;
}

interface ConfigMenuProps {
  onConfigSelected?: () => void;
}

export const ConfigMenu = React.forwardRef<ConfigMenuRef, ConfigMenuProps>(
  ({ onConfigSelected }, ref) => {
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [editingConfig, setEditingConfig] =
      React.useState<Configuration | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [configToDelete, setConfigToDelete] =
      React.useState<Configuration | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const {
      configs,
      activeConfig,
      selectConfig,
      deleteConfig,
      createConfig,
      updateConfig,
      importConfig,
      exportConfig,
    } = useChatConfig();

    React.useImperativeHandle(ref, () => ({
      openDropdown: () => setDropdownOpen(true),
    }));

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

      selectConfig(value);

      setDropdownOpen(false);
      setTimeout(() => {
        onConfigSelected?.();
      }, 100);
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

      deleteConfig(configToDelete.id);
      setDeleteConfirmOpen(false);
      setConfigToDelete(null);
    };

    const handleSave = (finalFormData: Configuration) => {
      try {
        if (editingConfig) {
          updateConfig(finalFormData);
        } else {
          createConfig(finalFormData);
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

    const handleDuplicate = (config: Configuration) => {
      const duplicatedConfig: Configuration = {
        ...config,
        id: Date.now().toString(),
        name: `${config.name}-copy`,
        active: false,
      };
      createConfig(duplicatedConfig);
      setDialogOpen(false);
      setEditingConfig(null);
    };

    const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const rawConfig = JSON.parse(content);
          importConfig(rawConfig);
        } catch (error) {
          alert(
            `Failed to import config: ${
              error instanceof Error ? error.message : "invalid JSON file"
            }`,
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
                <TextEllipsis maxWidth="120px" style={{ flexGrow: 1 }}>
                  {activeConfig?.name || "Select config"}
                </TextEllipsis>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              size="2"
              variant="soft"
              color="gray"
              onCloseAutoFocus={(e) => e.preventDefault()}
              style={{ width: 180 }}
            >
              {configs.map((config) => (
                <ConfigMenuItem
                  key={config.id}
                  config={config}
                  onSelect={handleConfigChange}
                  onEdit={handleEditConfig}
                />
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
          onDelete={handleDeleteConfig}
          onDuplicate={handleDuplicate}
        />

        <DeleteConfigDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          config={configToDelete}
          onConfirm={confirmDelete}
        />
      </>
    );
  },
);
