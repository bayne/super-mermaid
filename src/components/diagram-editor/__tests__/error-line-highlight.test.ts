import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { errorLineField, setErrorLine } from "../error-line-highlight";

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [errorLineField],
  });
}

describe("errorLineField", () => {
  it("starts with no decorations", () => {
    const state = createState("line 1\nline 2\nline 3");
    const decos = state.field(errorLineField);
    const iter = decos.iter();
    expect(iter.value).toBeNull();
  });

  it("adds decoration for valid error line", () => {
    const state = createState("line 1\nline 2\nline 3");
    const tr = state.update({ effects: setErrorLine.of(2) });
    const decos = tr.state.field(errorLineField);
    const iter = decos.iter();
    expect(iter.value).not.toBeNull();
    expect(iter.from).toBe(state.doc.line(2).from);
  });

  it("clears decoration when set to null", () => {
    const state = createState("line 1\nline 2\nline 3");
    const tr1 = state.update({ effects: setErrorLine.of(2) });
    const tr2 = tr1.state.update({ effects: setErrorLine.of(null) });
    const decos = tr2.state.field(errorLineField);
    const iter = decos.iter();
    expect(iter.value).toBeNull();
  });

  it("ignores line number out of range (too large)", () => {
    const state = createState("line 1\nline 2");
    const tr = state.update({ effects: setErrorLine.of(5) });
    const decos = tr.state.field(errorLineField);
    const iter = decos.iter();
    expect(iter.value).toBeNull();
  });

  it("ignores line number out of range (zero)", () => {
    const state = createState("line 1\nline 2");
    const tr = state.update({ effects: setErrorLine.of(0) });
    const decos = tr.state.field(errorLineField);
    const iter = decos.iter();
    expect(iter.value).toBeNull();
  });

  it("maps decorations through document changes", () => {
    const state = createState("line 1\nline 2\nline 3");
    const tr1 = state.update({ effects: setErrorLine.of(3) });
    const tr2 = tr1.state.update({
      changes: { from: 0, insert: "new line\n" },
    });
    const decos = tr2.state.field(errorLineField);
    const iter = decos.iter();
    expect(iter.value).not.toBeNull();
  });
});
