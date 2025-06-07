import * as React from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import { Box } from "@radix-ui/themes";
import { Message as MessageType } from "../../types";

interface MessageProps {
  message: MessageType;
  isStreaming: Boolean;
  isLast: Boolean;
}

const renderer = new marked.Renderer();

renderer.code = (code, language) => {
  const highlightedCode = hljs.highlight(code, {
    language: language || "text",
    ignoreIllegals: true,
  }).value;
  return `
      <pre data-language="${language || "text"}">
        <code class="hljs ${language || ""}">${highlightedCode}</code>
        <button class="copy-button" data-code="${encodeURIComponent(code)}">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 9.50006C1 10.3285 1.67157 11.0001 2.5 11.0001H4L4 10.0001H2.5C2.22386 10.0001 2 9.7762 2 9.50006L2 2.50006C2 2.22392 2.22386 2.00006 2.5 2.00006L9.5 2.00006C9.77614 2.00006 10 2.22392 10 2.50006V4.00002L11 4.00002V2.50006C11 1.67163 10.3284 1.00006 9.5 1.00006H2.5C1.67157 1.00006 1 1.67163 1 2.50006V9.50006ZM5.50006 4.00002C4.67163 4.00002 4.00006 4.67159 4.00006 5.50002V12.5C4.00006 13.3284 4.67163 14 5.50006 14H12.5C13.3284 14 14 13.3284 14 12.5V5.50002C14 4.67159 13.3284 4.00002 12.5 4.00002H5.50006ZM5.00006 5.50002C5.00006 5.22388 5.22392 5.00002 5.50006 5.00002H12.5C12.7761 5.00002 13 5.22388 13 5.50002V12.5C13 12.7761 12.7761 13 12.5 13H5.50006C5.22392 13 5.00006 12.7761 5.00006 12.5V5.50002Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
          </svg>
        </button>
      </pre>
  `;
};

marked.setOptions({
  renderer,
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : "text";
    return hljs.highlight(code, { language }).value;
  },
});

export const Message: React.FC<MessageProps> = ({ message, isStreaming }) => {
  const messageRef = React.useRef<HTMLDivElement>(null);

  let parsedContent;
  try {
    parsedContent = marked(message.content);
  } catch (error) {
    console.warn("Error parsing message content as markdown:", error);
    parsedContent = message.content;
  }

  React.useEffect(() => {
    const handleCopyClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".copy-button") as HTMLButtonElement;
      if (button && button.dataset.code) {
        const code = decodeURIComponent(button.dataset.code);
        navigator.clipboard.writeText(code).then(() => {
          // Visual feedback could be added here
          console.log("Code copied to clipboard");
        });
      }
    };

    const messageElement = messageRef.current;
    if (messageElement) {
      messageElement.addEventListener("click", handleCopyClick);
      return () => messageElement.removeEventListener("click", handleCopyClick);
    }
  }, [parsedContent]);

  return (
    <Box
      ref={messageRef}
      p={message.role === "user" ? "3" : "0"}
      className={`chat-message chat-message-${message.role}`}
      style={{
        backgroundColor:
          message.role === "user" ? "var(--gray-3)" : "transparent",
        borderRadius: message.role === "user" ? "var(--radius-3)" : "0",
        wordBreak: "break-word",
        opacity: isStreaming ? 0.7 : 1,
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: parsedContent }} />
    </Box>
  );
};
