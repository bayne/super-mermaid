import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { remoteCursorField, setRemoteCursors } from "../remote-cursors";
import type { CursorUpdate } from "@/lib/types";

function createState(doc = "hello world") {
  return EditorState.create({
    doc,
    extensions: [remoteCursorField],
  });
}

describe("remoteCursorField", () => {
  it("starts with empty decorations", () => {
    const state = createState();
    const decos = state.field(remoteCursorField);
    const iter = decos.iter();
    expect(iter.value).toBeNull();
  });

  it("creates decorations from cursor updates", () => {
    const state = createState();
    const cursors: CursorUpdate[] = [
      {
        userId: "u1",
        position: 3,
        selectionHead: 3,
        selectionAnchor: 3,
        color: "#E63946",
        name: "Alice",
      },
    ];

    const tr = state.update({
      effects: setRemoteCursors.of(cursors),
    });

    const decos = tr.state.field(remoteCursorField);
    const iter = decos.iter();
    expect(iter.value).not.toBeNull();
    expect(iter.from).toBe(3);
  });

  it("creates selection mark when head != anchor", () => {
    const state = createState("hello world");
    const cursors: CursorUpdate[] = [
      {
        userId: "u1",
        position: 5,
        selectionHead: 2,
        selectionAnchor: 8,
        color: "#E63946",
        name: "Alice",
      },
    ];

    const tr = state.update({
      effects: setRemoteCursors.of(cursors),
    });

    const decos = tr.state.field(remoteCursorField);
    let count = 0;
    const iter = decos.iter();
    while (iter.value) {
      count++;
      iter.next();
    }
    // Widget cursor + mark selection = 2 decorations
    expect(count).toBe(2);
  });

  it("clamps positions to document length", () => {
    const state = createState("hi"); // length = 2
    const cursors: CursorUpdate[] = [
      {
        userId: "u1",
        position: 100,
        selectionHead: 100,
        selectionAnchor: 100,
        color: "#E63946",
        name: "Alice",
      },
    ];

    const tr = state.update({
      effects: setRemoteCursors.of(cursors),
    });

    const decos = tr.state.field(remoteCursorField);
    const iter = decos.iter();
    expect(iter.value).not.toBeNull();
    expect(iter.from).toBe(2); // clamped to doc length
  });

  it("handles multiple cursors", () => {
    const state = createState("hello world test");
    const cursors: CursorUpdate[] = [
      {
        userId: "u1",
        position: 3,
        selectionHead: 3,
        selectionAnchor: 3,
        color: "#E63946",
        name: "Alice",
      },
      {
        userId: "u2",
        position: 8,
        selectionHead: 8,
        selectionAnchor: 8,
        color: "#457B9D",
        name: "Bob",
      },
    ];

    const tr = state.update({
      effects: setRemoteCursors.of(cursors),
    });

    const decos = tr.state.field(remoteCursorField);
    let count = 0;
    const iter = decos.iter();
    while (iter.value) {
      count++;
      iter.next();
    }
    expect(count).toBe(2);
  });

  it("creates widget with correct DOM structure", () => {
    const state = createState("hello");
    const cursors: CursorUpdate[] = [
      {
        userId: "u1",
        position: 2,
        selectionHead: 2,
        selectionAnchor: 2,
        color: "#E63946",
        name: "Alice",
      },
    ];

    const tr = state.update({ effects: setRemoteCursors.of(cursors) });
    const decos = tr.state.field(remoteCursorField);
    const iter = decos.iter();

    // Get the widget and call toDOM
    const widget = iter.value?.spec?.widget;
    expect(widget).toBeDefined();
    if (widget) {
      const dom = widget.toDOM(
        EditorView.findFromDOM(document.createElement("div"))!
      );
      expect(dom.querySelector("span")).toBeTruthy();
    }
  });

  it("widget eq returns true for same color and name", () => {
    const state = createState("hello");
    const cursors1: CursorUpdate[] = [
      {
        userId: "u1",
        position: 2,
        selectionHead: 2,
        selectionAnchor: 2,
        color: "#E63946",
        name: "Alice",
      },
    ];
    const cursors2: CursorUpdate[] = [
      {
        userId: "u1",
        position: 3,
        selectionHead: 3,
        selectionAnchor: 3,
        color: "#E63946",
        name: "Alice",
      },
    ];

    const tr1 = state.update({ effects: setRemoteCursors.of(cursors1) });
    const tr2 = state.update({ effects: setRemoteCursors.of(cursors2) });

    const widget1 = tr1.state.field(remoteCursorField).iter().value?.spec?.widget;
    const widget2 = tr2.state.field(remoteCursorField).iter().value?.spec?.widget;

    expect(widget1 && widget2 && widget1.eq(widget2)).toBe(true);
  });

  it("widget eq returns false for different color", () => {
    const state = createState("hello");
    const cursors1: CursorUpdate[] = [
      {
        userId: "u1",
        position: 2,
        selectionHead: 2,
        selectionAnchor: 2,
        color: "#E63946",
        name: "Alice",
      },
    ];
    const cursors2: CursorUpdate[] = [
      {
        userId: "u2",
        position: 2,
        selectionHead: 2,
        selectionAnchor: 2,
        color: "#457B9D",
        name: "Alice",
      },
    ];

    const tr1 = state.update({ effects: setRemoteCursors.of(cursors1) });
    const tr2 = state.update({ effects: setRemoteCursors.of(cursors2) });

    const widget1 = tr1.state.field(remoteCursorField).iter().value?.spec?.widget;
    const widget2 = tr2.state.field(remoteCursorField).iter().value?.spec?.widget;

    expect(widget1 && widget2 && widget1.eq(widget2)).toBe(false);
  });

  it("widget ignoreEvent returns true", () => {
    const state = createState("hello");
    const cursors: CursorUpdate[] = [
      {
        userId: "u1",
        position: 2,
        selectionHead: 2,
        selectionAnchor: 2,
        color: "#E63946",
        name: "Alice",
      },
    ];

    const tr = state.update({ effects: setRemoteCursors.of(cursors) });
    const widget = tr.state.field(remoteCursorField).iter().value?.spec?.widget;
    expect(widget?.ignoreEvent()).toBe(true);
  });

  it("preserves decorations on unrelated changes", () => {
    const state = createState("hello");
    const cursors: CursorUpdate[] = [
      {
        userId: "u1",
        position: 2,
        selectionHead: 2,
        selectionAnchor: 2,
        color: "#E63946",
        name: "Alice",
      },
    ];

    const state2 = state.update({
      effects: setRemoteCursors.of(cursors),
    }).state;

    // Apply a text change
    const state3 = state2.update({
      changes: { from: 5, insert: " world" },
    }).state;

    const decos = state3.field(remoteCursorField);
    const iter = decos.iter();
    expect(iter.value).not.toBeNull();
  });
});
