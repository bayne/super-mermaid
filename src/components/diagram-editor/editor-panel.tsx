"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { mermaid } from "codemirror-lang-mermaid";
import { oneDark } from "@codemirror/theme-one-dark";
import { vim } from "@replit/codemirror-vim";
import { remoteCursorField, setRemoteCursors } from "./remote-cursors";
import { errorLineField, setErrorLine } from "./error-line-highlight";
import { SnippetLibrary } from "./snippet-library";
import { snippetCompletionExtension } from "@/lib/snippet-completion";
import type { CursorUpdate } from "@/lib/types";
import type { ViewUpdate } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

// Hoisted to a stable reference. @uiw/react-codemirror reconfigures the whole
// editor whenever the `basicSetup` or `extensions` props change identity, and a
// reconfigure discards CodeMirror state that was added via appendConfig — most
// notably the active snippet field tracking. Passing a fresh object/array on
// every render (which happens on every keystroke, since `content` is
// controlled) therefore silently kills an in-progress snippet mid-edit, so
// Tab stops advancing fields and falls back to indentation.
const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  bracketMatching: true,
  closeBrackets: true,
  // We supply our own snippet-backed autocompletion (see
  // snippetCompletionExtension); disable the default to avoid two competing
  // completion configs.
  autocompletion: false,
} as const;

interface Props {
  content: string;
  onChange: (value: string) => void;
  remoteCursors: CursorUpdate[];
  onCursorChange: (selection: { head: number; anchor: number }) => void;
  darkMode: boolean;
  errorLine: number | null;
  vimMode: boolean;
  autocomplete: boolean;
}

export function EditorPanel({
  content,
  onChange,
  remoteCursors: remoteCursorData,
  onCursorChange,
  darkMode,
  errorLine,
  vimMode,
  autocomplete,
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

  // Memoized so the array keeps a stable identity across keystroke re-renders;
  // see BASIC_SETUP above. Only genuine config changes (mode toggles, theme)
  // rebuild it and reconfigure the editor.
  const extensions = useMemo<Extension[]>(() => {
    const exts: Extension[] = [];
    // Vim must come first so its keymap takes precedence over the basic setup.
    if (vimMode) exts.push(vim());
    exts.push(mermaid(), remoteCursorField, errorLineField);
    if (autocomplete) exts.push(snippetCompletionExtension());
    if (darkMode) exts.push(oneDark);
    return exts;
  }, [vimMode, autocomplete, darkMode]);

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
          className="h-full"
          basicSetup={BASIC_SETUP}
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
