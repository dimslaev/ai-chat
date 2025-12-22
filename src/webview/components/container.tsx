import { Flex } from "@radix-ui/themes";
import * as React from "react";

import { Config, ConfigRef } from "@/components/config/config";
import { Context } from "@/components/context/context";
import { Input } from "@/components/input/input";
import { EmptyState } from "@/components/messages/empty-state";
import { Messages } from "@/components/messages/messages";
import { useChatSync } from "@/hooks/use-chat-sync";
import { PostMessage } from "@/lib/types";
import { useChatStore } from "@/store/chat";

export const Container: React.FC = () => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const configRef = React.useRef<ConfigRef>(null);
  const vscode = useChatStore((state) => state.vscode);

  useChatSync();

  const handleConfigSelected = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!vscode) return;

    const handleMessage = (event: MessageEvent<PostMessage>) => {
      if (event.data.type === "focusInput") {
        inputRef.current?.focus();
      } else if (event.data.type === "openConfigMenu") {
        configRef.current?.openConfigMenu();
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
      <Config ref={configRef} onConfigSelected={handleConfigSelected} />
      <Context />
      <EmptyState />
      <Messages />
      <Input inputRef={inputRef} />
    </Flex>
  );
};
