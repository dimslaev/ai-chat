import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { IconButton } from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";

interface MarkdownProps {
  content: string;
}

const CopyButton: React.FC<{ codeRef: React.RefObject<HTMLElement> }> = ({
  codeRef,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeRef.current?.textContent ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <IconButton
      size="2"
      variant="soft"
      className="action-button copy-button"
      onClick={handleCopy}
      color="gray"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </IconButton>
  );
};

const CodeBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const codeRef = React.useRef<HTMLElement>(null);
  return (
    <div style={{ position: "relative" }}>
      <CopyButton codeRef={codeRef} />
      <code ref={codeRef} className={className}>
        {children}
      </code>
    </div>
  );
};

export const RawMarkdown: React.FC<MarkdownProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre: ({ children, node, ...props }) => <pre {...props}>{children}</pre>,
        code: ({ children, className, node, ...props }) => {
          const isInline = !className?.includes("language-");

          if (isInline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }

          return <CodeBlock className={className}>{children}</CodeBlock>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export const Markdown = React.memo(RawMarkdown);
