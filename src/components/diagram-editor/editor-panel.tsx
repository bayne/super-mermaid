"use client";

import { useRef, useEffect, useCallback } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { mermaid } from "codemirror-lang-mermaid";
import { remoteCursorField, setRemoteCursors } from "./remote-cursors";
import type { CursorUpdate } from "@/lib/types";
import type { ViewUpdate } from "@codemirror/view";

interface Props {
  content: string;
  onChange: (value: string) => void;
  remoteCursors: CursorUpdate[];
  onCursorChange: (selection: { head: number; anchor: number }) => void;
}

export function EditorPanel({
  content,
  onChange,
  remoteCursors: remoteCursorData,
  onCursorChange,
}: Props) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    const view = editorRef.current?.view;
    if (!view) return;
    view.dispatch({
      effects: setRemoteCursors.of(remoteCursorData),
    });
  }, [remoteCursorData]);

  const handleUpdate = useCallback(
    (viewUpdate: ViewUpdate) => {
      if (viewUpdate.selectionSet) {
        const main = viewUpdate.state.selection.main;
        onCursorChange({ head: main.head, anchor: main.anchor });
      }
    },
    [onCursorChange]
  );

  return (
    <div className="h-full overflow-auto">
      <CodeMirror
        ref={editorRef}
        value={content}
        onChange={onChange}
        onUpdate={handleUpdate}
        extensions={[mermaid(), remoteCursorField]}
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
  );
}
