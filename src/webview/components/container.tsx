import * as React from "react";
import { Flex } from "@radix-ui/themes";
import { Messages } from "@/components/messages/messages";
import { EmptyState } from "@/components/messages/empty-state";
import { Config } from "@/components/config/config";
import { Context } from "@/components/context/context";
import { Input } from "@/components/input/input";
import { useChatSync } from "@/hooks/useChatSync";
import { useChatStore } from "@/store/chat";
import { PostMessage } from "@/lib/types";

export const Container: React.FC = () => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const vscode = useChatStore((state) => state.vscode);

  useChatSync();

  React.useEffect(() => {
    if (!vscode) return;

    const handleMessage = (event: MessageEvent<PostMessage>) => {
      if (event.data.type === "focusInput") {
        inputRef.current?.focus();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [vscode]);

  return (
    <Flex
      direction="column"
      style={{
        height: "100vh",
        background: "var(--color-background)",
        color: "var(--color-foreground)",
        position: "relative",
      }}
    >
      <Config />
      <Context />
      <EmptyState />
      <Messages />
      <Input inputRef={inputRef} />
    </Flex>
  );
};
