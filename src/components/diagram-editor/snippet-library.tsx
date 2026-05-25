"use client";

import { useMemo } from "react";
import {
  MERMAID_SNIPPETS,
  detectDiagramType,
  scoreSnippet,
  getContextWords,
  plainSnippet,
} from "@/lib/mermaid-snippets";

interface Props {
  content: string;
  cursorLine: number;
  onInsert: (text: string) => void;
}

export function SnippetLibrary({ content, cursorLine, onInsert }: Props) {
  const sortedSnippets = useMemo(() => {
    const diagramType = detectDiagramType(content);
    const contextWords = getContextWords(content, cursorLine);

    return [...MERMAID_SNIPPETS]
      .map((s) => ({
        snippet: s,
        score: scoreSnippet(s, diagramType, contextWords),
      }))
      .sort((a, b) => b.score - a.score)
      .map((s) => s.snippet);
  }, [content, cursorLine]);

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {sortedSnippets.map((snippet) => {
          const text = plainSnippet(snippet.insert);
          return (
          <button
            key={snippet.label}
            onClick={() => onInsert(text)}
            className="shrink-0 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-300"
            title={text}
          >
            {snippet.label}
          </button>
          );
        })}
      </div>
    </div>
  );
}
