import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { CompletionContext } from "@codemirror/autocomplete";
import {
  snippetCompletions,
  snippetCompletionExtension,
} from "../snippet-completion";

function contextFor(doc: string, pos = doc.length, explicit = false) {
  const state = EditorState.create({ doc });
  return new CompletionContext(state, pos, explicit);
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
    expect(loop?.apply).toContain("loop Every minute");
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
