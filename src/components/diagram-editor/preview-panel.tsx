"use client";

import { useEffect, useState, useRef } from "react";
import { renderMermaid } from "@/lib/mermaid-renderer";

interface Props {
  content: string;
}

export function PreviewPanel({ content }: Props) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const result = await renderMermaid(content);
      if (result.error) {
        setError(result.error);
      } else {
        setSvg(result.svg);
        setError(null);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-4">
        {svg ? (
          <div
            className="flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          !error && (
            <div className="flex h-full items-center justify-center text-gray-400">
              Start typing to see your diagram
            </div>
          )
        )}
      </div>
      {error && (
        <div className="border-t border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
