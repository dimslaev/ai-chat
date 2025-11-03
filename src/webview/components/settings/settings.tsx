import * as React from "react";
import { Button, Flex, Text, DropdownMenu } from "@radix-ui/themes";
import {
  MixerHorizontalIcon,
  PlusIcon,
  TrashIcon,
  CaretDownIcon,
} from "@radix-ui/react-icons";
import { useChatStore } from "../../store";
import { useChatConfig } from "../../hooks";
import { Configuration } from "../../../lib/types";
import { ConfigDialog } from "./config-dialog";
import { DeleteConfigDialog } from "./delete-config-dialog";

export const Settings: React.FC = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] =
    React.useState<Configuration | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [configToDelete, setConfigToDelete] =
    React.useState<Configuration | null>(null);
  const configs = useChatStore((state) => state.configs);

  const { saveConfigs } = useChatConfig();

  const activeConfig = configs.find((c) => c.active);

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

  const handleSave = (finalFormData: Configuration) => {
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

  return (
    <>
      {configs.length === 0 ? (
        <Button
          variant="ghost"
          size="1"
          onClick={() => handleConfigChange("add-new")}
        >
          <CaretDownIcon />
          Add config
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

      <ConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingConfig={editingConfig}
        onSave={handleSave}
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
