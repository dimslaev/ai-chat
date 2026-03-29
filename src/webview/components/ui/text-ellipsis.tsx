import { Text } from "@radix-ui/themes";
import * as React from "react";

type TextEllipsisProps = React.ComponentProps<typeof Text> & {
  maxWidth?: string | number;
};

export const TextEllipsis = React.forwardRef<HTMLSpanElement, TextEllipsisProps>(
  ({ maxWidth, style, children, ...props }, ref) => {
    return (
      <Text
        ref={ref}
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
  },
);
