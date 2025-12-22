import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import * as React from "react";

import { Configuration } from "@/lib/types";

interface DeleteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: Configuration | null;
  onConfirm: () => void;
}

export const DeleteConfigDialog: React.FC<DeleteConfigDialogProps> = ({
  open,
  onOpenChange,
  config,
  onConfirm,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 350 }}>
        <Dialog.Title>Delete config</Dialog.Title>
        <Text>Are you sure you want to delete "{config?.name}"?</Text>
        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={onConfirm} color="red">
            Delete
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
