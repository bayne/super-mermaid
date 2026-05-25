import { describe, it, expect } from "vitest";
import { EditorState, type Transaction } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { CompletionContext, type Completion } from "@codemirror/autocomplete";
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
