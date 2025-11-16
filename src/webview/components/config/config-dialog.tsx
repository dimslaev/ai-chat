import * as React from "react";
import { Dialog, Button, Flex } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Configuration } from "@/lib/types";
import { useConfigForm } from "@/hooks/useConfigForm";
import { ConfigForm } from "@/components/config/config-form";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingConfig: Configuration | null;
  onSave: (config: Configuration) => void;
  onExport: (config: Configuration) => void;
  onDelete: (config: Configuration) => void;
}

export const ConfigDialog: React.FC<ConfigDialogProps> = ({
  open,
  onOpenChange,
  editingConfig,
  onSave,
  onExport,
  onDelete,
}) => {
  const {
    formData,
    field,
    updateField,
    toConfig,
    isValid,
    selectedTemplate,
    applyTemplate,
    templateInfoUrl,
  } = useConfigForm(editingConfig);

  const handleAction = (action: (config: Configuration) => void) => () => {
    action(toConfig());
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
            {editingConfig ? "Edit config" : "New config"}
          </Dialog.Title>
          <Dialog.Close>
            <Button variant="ghost" color="gray" size="1" tabIndex={-1}>
              <Cross2Icon />
            </Button>
          </Dialog.Close>
        </Flex>

        <ConfigForm
          formData={formData}
          field={field}
          updateField={updateField}
          isEditing={!!editingConfig}
          onExport={editingConfig ? handleAction(onExport) : undefined}
          onDelete={editingConfig ? handleAction(onDelete) : undefined}
          isValid={isValid}
          selectedTemplate={selectedTemplate}
          onTemplateChange={applyTemplate}
          templateInfoUrl={templateInfoUrl}
        />

        <Flex
          gap="3"
          p="4"
          justify="end"
          style={{
            borderTop: "1px solid var(--gray-6)",
          }}
        >
          <Button onClick={handleAction(onSave)} disabled={!isValid}>
            {editingConfig ? "Update" : "Add"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
