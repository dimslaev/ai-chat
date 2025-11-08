import * as React from "react";
import { Flex } from "@radix-ui/themes";
import { Messages } from "@/components/messages";
import { TopRow } from "@/components/top-row";
import { ContextSection } from "@/components/context-section";
import { Input } from "@/components/input";
import { useChatSync } from "@/hooks/useChatSync";
import { useChatStore } from "@/store/chat";
import { PostMessage } from "@/lib/types";
import { EmptyState } from "./empty-state";

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
      <TopRow />
      <ContextSection />
      <EmptyState />
      <Messages />
      <Input inputRef={inputRef} />
    </Flex>
  );
};
