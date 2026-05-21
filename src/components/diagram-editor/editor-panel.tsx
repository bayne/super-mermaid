"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { mermaid } from "codemirror-lang-mermaid";
import { oneDark } from "@codemirror/theme-one-dark";
import { remoteCursorField, setRemoteCursors } from "./remote-cursors";
import { errorLineField, setErrorLine } from "./error-line-highlight";
import { SnippetLibrary } from "./snippet-library";
import type { CursorUpdate } from "@/lib/types";
import type { ViewUpdate } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

interface Props {
  content: string;
  onChange: (value: string) => void;
  remoteCursors: CursorUpdate[];
  onCursorChange: (selection: { head: number; anchor: number }) => void;
  darkMode: boolean;
  errorLine: number | null;
}

export function EditorPanel({
  content,
  onChange,
  remoteCursors: remoteCursorData,
  onCursorChange,
  darkMode,
  errorLine,
}: Props) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [cursorLine, setCursorLine] = useState(1);

  useEffect(() => {
    const view = editorRef.current?.view;
    if (!view) return;
    view.dispatch({
      effects: setRemoteCursors.of(remoteCursorData),
    });
  }, [remoteCursorData]);

  useEffect(() => {
    const view = editorRef.current?.view;
    if (!view) return;
    view.dispatch({
      effects: setErrorLine.of(errorLine),
    });
  }, [errorLine]);

  const handleUpdate = useCallback(
    (viewUpdate: ViewUpdate) => {
      if (viewUpdate.selectionSet) {
        const main = viewUpdate.state.selection.main;
        onCursorChange({ head: main.head, anchor: main.anchor });
        setCursorLine(viewUpdate.state.doc.lineAt(main.head).number);
      }
    },
    [onCursorChange]
  );

  const handleInsertSnippet = useCallback((text: string) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const { head } = view.state.selection.main;
    view.dispatch({
      changes: { from: head, insert: text },
      selection: { anchor: head + text.length },
    });
    view.focus();
  }, []);

  const extensions: Extension[] = [mermaid(), remoteCursorField, errorLineField];
  if (darkMode) extensions.push(oneDark);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <CodeMirror
          ref={editorRef}
          value={content}
          onChange={onChange}
          onUpdate={handleUpdate}
          extensions={extensions}
          theme={darkMode ? "dark" : "light"}
          height="100%"
          className="h-full text-sm"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            bracketMatching: true,
            closeBrackets: true,
          }}
        />
      </div>
      <SnippetLibrary
        content={content}
        cursorLine={cursorLine}
        onInsert={handleInsertSnippet}
      />
    </div>
  );
}
