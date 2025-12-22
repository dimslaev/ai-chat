import * as React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/messages/code-block";

interface MarkdownProps {
  content: string;
}

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
