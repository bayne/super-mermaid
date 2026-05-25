import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, act } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import {
  startCompletion,
  moveCompletionSelection,
  currentCompletions,
} from "@codemirror/autocomplete";
import { EditorPanel } from "../editor-panel";

// Regression test for snippet-field navigation surviving the controlled
// `content` round-trip. EditorPanel is rendered unmocked (note: no vi.mock for
// @uiw/react-codemirror here, unlike editor-panel.test.tsx) so the real
// CodeMirror reconfigure behavior is exercised. If EditorPanel rebuilds its
// `extensions`/`basicSetup` props on every render, each keystroke reconfigures
// the editor and discards the active snippet, breaking Tab field navigation.

// Stable references mirror editor-client, where onChange/onCursorChange are
// memoized useCallbacks and remoteCursors only changes on remote activity. An
// unstable callback here would itself trigger reconfigures and mask the thing
// under test.
const NOOP = () => {};
const NO_CURSORS: never[] = [];

function ControlledEditor() {
  const [content, setContent] = useState("no");
  return (
    <EditorPanel
      content={content}
      onChange={setContent}
      remoteCursors={NO_CURSORS}
      onCursorChange={NOOP}
      darkMode={false}
      errorLine={null}
      vimMode={false}
      autocomplete={true}
    />
  );
}

function getView(): EditorView {
  const el = document.querySelector<HTMLElement>(".cm-editor");
  if (!el) throw new Error("editor not mounted");
  const view = EditorView.findFromDOM(el);
  if (!view) throw new Error("no EditorView");
  return view;
}

function pressKey(view: EditorView, name: string) {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: name,
      code: name,
      bubbles: true,
      cancelable: true,
    })
  );
}

describe("EditorPanel snippet field navigation (controlled round-trip)", () => {
  it("Tab advances snippet fields across keystroke re-renders", async () => {
    render(<ControlledEditor />);
    await new Promise((r) => setTimeout(r, 50));
    const view = getView();

    await act(async () => {
      view.focus();
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      startCompletion(view);
      await new Promise((r) => setTimeout(r, 250));
    });

    const idx = currentCompletions(view.state).findIndex(
      (o) => o.detail === "Node [rect]"
    );
    expect(idx).toBeGreaterThanOrEqual(0);

    await act(async () => {
      for (let i = 0; i <= idx; i++) moveCompletionSelection(true)(view);
    });
    await act(async () => {
      pressKey(view, "Tab"); // accept the snippet → "X[Label]", field X active
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(view.state.doc.toString()).toBe("X[Label]");

    await act(async () => {
      // Fill the first field; onChange re-renders the controlled parent.
      view.dispatch(view.state.replaceSelection("A"), {
        userEvent: "input.type",
      });
      await new Promise((r) => setTimeout(r, 250));
    });

    await act(async () => {
      pressKey(view, "Tab"); // must jump to the Label field, not indent
      await new Promise((r) => setTimeout(r, 30));
    });
    await act(async () => {
      view.dispatch(view.state.replaceSelection("B"), {
        userEvent: "input.type",
      });
      await new Promise((r) => setTimeout(r, 30));
    });
    await act(async () => {
      // Enter exits to the trailing field (past `]`) rather than splitting the
      // node with a newline.
      pressKey(view, "Enter");
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(view.state.doc.toString()).toBe("A[B]");
  });
});
