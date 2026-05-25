import { describe, it, expect } from "vitest";
import { EditorState, type Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import {
  CompletionContext,
  startCompletion,
  moveCompletionSelection,
  currentCompletions,
  selectedCompletionIndex,
  type Completion,
} from "@codemirror/autocomplete";
import {
  snippetCompletions,
  snippetCompletionExtension,
} from "../snippet-completion";

function contextFor(doc: string, pos = doc.length, explicit = false) {
  const state = EditorState.create({ doc });
  return new CompletionContext(state, pos, explicit);
}

// Applies a completion's `apply` function (a snippet inserter) to an empty
// document and returns the resulting text, so tests can assert on what gets
// inserted regardless of the `${field}` placeholder markers in the template.
function applyToText(completion: Completion): string {
  const apply = completion.apply;
  if (typeof apply !== "function") {
    throw new Error("expected a snippet apply function");
  }
  let result = "";
  // `snippet()`'s applier only touches `state` and `dispatch`, so a minimal
  // stub stands in for a real EditorView here.
  const view = {
    state: EditorState.create({ doc: "" }),
    dispatch: (tr: Transaction) => {
      result = tr.newDoc.toString();
    },
  } as unknown as EditorView;
  apply(view, completion, 0, 0);
  return result;
}

describe("snippetCompletions", () => {
  it("returns null when no word precedes the cursor", () => {
    expect(snippetCompletions(contextFor("graph TD\n  "))).toBeNull();
  });

  it("suggests snippets matching a typed prefix", () => {
    const result = snippetCompletions(contextFor("se"));
    expect(result).not.toBeNull();
    expect(result!.from).toBe(0);
    expect(result!.filter).toBe(false);
    const labels = result!.options.map((o) => o.detail);
    expect(labels).toContain("Sequence Diagram");
  });

  it("applies the full snippet body, not the typed trigger", () => {
    const result = snippetCompletions(contextFor("loop", 4, false));
    const loop = result!.options.find((o) => o.detail === "Loop");
    expect(applyToText(loop!)).toContain("loop Every minute");
  });

  it("inserts placeholder field defaults without the snippet markers", () => {
    const result = snippetCompletions(contextFor("nod", 3, false));
    const rect = result!.options.find((o) => o.detail === "Node [rect]");
    expect(applyToText(rect!)).toBe("X[Label]");
  });

  it("matches substrings only when completion is explicit", () => {
    // "graph" appears inside the "subgraph" keyword but is not a prefix of it.
    const implicit = snippetCompletions(contextFor("ubgrap", 6, false));
    expect(
      implicit?.options.some((o) => o.detail === "Subgraph")
    ).toBeFalsy();

    const explicit = snippetCompletions(contextFor("ubgrap", 6, true));
    expect(explicit?.options.some((o) => o.detail === "Subgraph")).toBe(true);
  });

  it("ranks context-appropriate snippets higher via boost", () => {
    // Inside a sequence diagram, sequence snippets should outrank others.
    const result = snippetCompletions(
      contextFor("sequenceDiagram\n    n", 21, false)
    );
    const note = result!.options.find((o) => o.detail === "Note");
    expect(note).toBeDefined();
    expect(note!.boost).toBeGreaterThan(0);
  });
});

describe("snippetCompletionExtension", () => {
  it("produces a non-empty extension", () => {
    const ext = snippetCompletionExtension();
    expect(Array.isArray(ext)).toBe(true);
    expect((ext as unknown[]).length).toBeGreaterThan(0);
  });
});

// Integration tests that drive a real EditorView through the same keymap a user
// hits, asserting on Tab's disambiguation between accepting a completion,
// advancing a snippet field, and plain indentation.
describe("snippetCompletionExtension key handling", () => {
  function mountEditor(doc: string) {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: { anchor: doc.length },
        extensions: [
          // Mirror @uiw/react-codemirror's basicSetup, which binds Tab to
          // indentWithTab at default precedence — the binding our Prec.highest
          // keymap must beat while a snippet is active.
          keymap.of([indentWithTab]),
          snippetCompletionExtension(),
        ],
      }),
      parent,
    });
    return view;
  }

  function key(view: EditorView, name: string) {
    view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: name,
        code: name,
        bubbles: true,
        cancelable: true,
      })
    );
  }

  // Typing in jsdom doesn't fire CodeMirror's input pipeline, so replace the
  // selection directly with the same userEvent a keystroke would carry.
  function typeText(view: EditorView, text: string) {
    view.dispatch(view.state.replaceSelection(text), {
      userEvent: "input.type",
    });
  }

  async function selectOption(view: EditorView, detail: string) {
    startCompletion(view);
    // Let the (synchronous) override resolve into completion state.
    await new Promise((r) => setTimeout(r, 250));
    const idx = currentCompletions(view.state).findIndex(
      (o) => o.detail === detail
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    // ArrowDown moves from "no selection" (selectOnOpen: false) onto option 0,
    // so reaching index N takes N+1 presses.
    for (let i = 0; i <= idx; i++) moveCompletionSelection(true)(view);
    expect(selectedCompletionIndex(view.state)).toBe(idx);
  }

  it("Tab does not accept until the user explicitly selects an option", async () => {
    const view = mountEditor("se");
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 250));
    // Popup is open but nothing is highlighted (selectOnOpen: false), so Tab
    // indents rather than accepting whatever happened to be first.
    expect(selectedCompletionIndex(view.state)).toBe(null);
    key(view, "Tab");
    expect(view.state.doc.toString()).toBe("  se");
    view.destroy();
  });

  it("Tab walks the inserted snippet's fields instead of indenting", async () => {
    const view = mountEditor("no");
    await selectOption(view, "Node [rect]");
    key(view, "Tab"); // accept the highlighted completion
    expect(view.state.doc.toString()).toBe("X[Label]");
    typeText(view, "A"); // fill the first field; reopens the popup, unselected
    await new Promise((r) => setTimeout(r, 250));
    key(view, "Tab"); // must advance to the next field, not indent
    typeText(view, "B");
    key(view, "Enter");
    expect(view.state.doc.toString()).toBe("A[B]");
    view.destroy();
  });
});
