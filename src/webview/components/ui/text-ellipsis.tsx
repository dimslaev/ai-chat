import { Text } from "@radix-ui/themes";
import * as React from "react";

type TextEllipsisProps = React.ComponentProps<typeof Text> & {
  maxWidth?: string | number;
};

export const TextEllipsis: React.FC<TextEllipsisProps> = ({
  maxWidth,
  style,
  children,
  ...props
}) => {
  return (
    <Text
      {...props}
      style={{
        ...style,
        maxWidth,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Text>
  );
};
