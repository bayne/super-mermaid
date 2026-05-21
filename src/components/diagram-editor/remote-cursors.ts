import {
  EditorView,
  Decoration,
  type DecorationSet,
  WidgetType,
} from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import type { CursorUpdate } from "@/lib/types";

export const setRemoteCursors = StateEffect.define<CursorUpdate[]>();

class RemoteCursorWidget extends WidgetType {
  constructor(
    readonly color: string,
    readonly name: string
  ) {
    super();
  }

  eq(other: RemoteCursorWidget) {
    return other.color === this.color && other.name === this.name;
  }

  toDOM() {
    const wrapper = document.createElement("span");
    wrapper.style.position = "relative";
    wrapper.style.width = "0";
    wrapper.style.display = "inline-block";

    const cursor = document.createElement("span");
    cursor.style.borderLeft = `2px solid ${this.color}`;
    cursor.style.height = "1.2em";
    cursor.style.position = "absolute";
    cursor.style.top = "0";
    cursor.style.left = "0";
    cursor.style.pointerEvents = "none";

    const label = document.createElement("span");
    label.style.backgroundColor = this.color;
    label.style.color = "white";
    label.style.fontSize = "10px";
    label.style.padding = "1px 4px";
    label.style.borderRadius = "2px";
    label.style.position = "absolute";
    label.style.top = "-1.4em";
    label.style.left = "0";
    label.style.whiteSpace = "nowrap";
    label.style.pointerEvents = "none";
    label.style.zIndex = "10";
    label.textContent = this.name;

    wrapper.appendChild(cursor);
    wrapper.appendChild(label);
    return wrapper;
  }

  ignoreEvent() {
    return true;
  }
}

export const remoteCursorField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setRemoteCursors)) {
        const docLength = tr.state.doc.length;
        const allDecorations: { from: number; to?: number; decoration: Decoration }[] = [];

        for (const cursor of effect.value) {
          const pos = Math.min(cursor.position, docLength);
          allDecorations.push({
            from: pos,
            decoration: Decoration.widget({
              widget: new RemoteCursorWidget(cursor.color, cursor.name),
              side: 1,
            }),
          });

          if (cursor.selectionHead !== cursor.selectionAnchor) {
            const from = Math.min(
              Math.min(cursor.selectionHead, cursor.selectionAnchor),
              docLength
            );
            const to = Math.min(
              Math.max(cursor.selectionHead, cursor.selectionAnchor),
              docLength
            );
            if (from < to) {
              allDecorations.push({
                from,
                to,
                decoration: Decoration.mark({
                  class: "remote-selection",
                  attributes: {
                    style: `background-color: ${cursor.color}33`,
                  },
                }),
              });
            }
          }
        }

        const sorted = allDecorations.sort((a, b) => a.from - b.from);
        return Decoration.set(
          sorted.map((d) =>
            d.to !== undefined
              ? d.decoration.range(d.from, d.to)
              : d.decoration.range(d.from)
          )
        );
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});
