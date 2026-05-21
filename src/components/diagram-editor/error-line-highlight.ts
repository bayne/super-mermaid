import { StateField, StateEffect } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";
import { EditorView } from "@codemirror/view";

export const setErrorLine = StateEffect.define<number | null>();

export const errorLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setErrorLine)) {
        if (effect.value === null) return Decoration.none;
        const line = effect.value;
        if (line < 1 || line > tr.state.doc.lines) return Decoration.none;
        const lineObj = tr.state.doc.line(line);
        return Decoration.set([
          Decoration.line({ class: "cm-error-line" }).range(lineObj.from),
        ]);
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});
