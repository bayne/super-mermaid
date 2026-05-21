"use client";

import { useEffect, useState, useRef } from "react";
import { renderMermaid, type RenderResult } from "@/lib/mermaid-renderer";

const EMPTY: RenderResult = { svg: "", error: null, errorLine: null };

export function useMermaidRender(
  content: string,
  darkMode: boolean
): RenderResult {
  const [result, setResult] = useState<RenderResult>(EMPTY);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const res = await renderMermaid(content, darkMode ? "dark" : "default");
      if (res.error) {
        setResult((prev) => ({
          ...prev,
          error: res.error,
          errorLine: res.errorLine,
        }));
      } else {
        setResult(res);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, darkMode]);

  return result;
}
