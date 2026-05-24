"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders Claude's chat responses as markdown. Tailwind has no typography
// plugin here, so element spacing/styling is set explicitly per node type.
export function Markdown({ content }: { content: string }) {
  return (
    <div className="space-y-2 break-words text-sm text-gray-800 dark:text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-base font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold">{children}</h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded bg-gray-800 px-3 py-2 font-mono text-xs text-gray-100 dark:bg-black">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-xs dark:bg-gray-700">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-1">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 dark:border-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-2 py-1 text-left font-semibold dark:border-gray-600">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-2 py-1 dark:border-gray-600">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
