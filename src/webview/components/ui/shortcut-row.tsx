import { Kbd, Text } from "@radix-ui/themes";
import * as React from "react";

interface ShortcutRowProps {
  keys: string;
  description: string;
}

export const ShortcutRow: React.FC<ShortcutRowProps> = ({
  keys,
  description,
}) => {
  return (
    <tr>
      <td style={{ padding: "4px 12px 4px 0" }}>
        <Kbd size="3" style={{ width: "100%" }}>
          {keys}
        </Kbd>
      </td>
      <td style={{ padding: "4px 0" }}>
        <Text size="2" style={{ color: "var(--gray-10)" }}>
          {description}
        </Text>
      </td>
    </tr>
  );
};
