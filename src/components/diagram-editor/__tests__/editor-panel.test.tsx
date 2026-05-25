import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@uiw/react-codemirror", () => {
  const { forwardRef } = require("react");
  return {
    __esModule: true,
    default: forwardRef(function MockCodeMirror(
      props: {
        value: string;
        onChange?: (value: string) => void;
        onUpdate?: (update: {
          selectionSet: boolean;
          state: {
            selection: { main: { head: number; anchor: number } };
            doc: { lineAt: (pos: number) => { number: number } };
          };
        }) => void;
      },
      ref: React.Ref<unknown>
    ) {
      if (typeof ref === "function") {
        ref({ view: { dispatch: vi.fn() } });
      } else if (ref && typeof ref === "object") {
        (ref as React.MutableRefObject<unknown>).current = {
          view: { dispatch: vi.fn() },
        };
      }
      return (
        <textarea
          data-testid="codemirror"
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          onFocus={() =>
            props.onUpdate?.({
              selectionSet: true,
              state: {
                selection: { main: { head: 0, anchor: 0 } },
                doc: { lineAt: () => ({ number: 1 }) },
              },
            })
          }
        />
      );
    }),
  };
});

vi.mock("codemirror-lang-mermaid", () => ({
  mermaid: vi.fn(() => []),
}));

vi.mock("@codemirror/theme-one-dark", () => ({
  oneDark: [],
}));

vi.mock("../remote-cursors", () => ({
  remoteCursorField: [],
  setRemoteCursors: { of: vi.fn() },
}));

vi.mock("../error-line-highlight", () => ({
  errorLineField: [],
  setErrorLine: { of: vi.fn() },
}));

vi.mock("../snippet-library", () => ({
  SnippetLibrary: () => <div data-testid="snippet-library" />,
}));

vi.mock("@replit/codemirror-vim", () => ({
  vim: vi.fn(() => []),
}));

vi.mock("@/lib/snippet-completion", () => ({
  snippetCompletionExtension: vi.fn(() => []),
}));

import { EditorPanel } from "../editor-panel";

describe("EditorPanel", () => {
  const defaultProps = {
    content: "graph TD\n  A --> B",
    onChange: vi.fn(),
    remoteCursors: [],
    onCursorChange: vi.fn(),
    darkMode: false,
    errorLine: null,
    vimMode: false,
    autocomplete: true,
  };

  it("renders with content", () => {
    render(<EditorPanel {...defaultProps} />);
    const editor = screen.getByTestId("codemirror");
    expect(editor).toHaveValue("graph TD\n  A --> B");
  });

  it("calls onChange when editor value changes", () => {
    render(<EditorPanel {...defaultProps} />);
    const editor = screen.getByTestId("codemirror");
    fireEvent.change(editor, { target: { value: "new content" } });
    expect(defaultProps.onChange).toHaveBeenCalledWith("new content");
  });

  it("calls onCursorChange on focus (selection set)", () => {
    render(<EditorPanel {...defaultProps} />);
    const editor = screen.getByTestId("codemirror");
    fireEvent.focus(editor);
    expect(defaultProps.onCursorChange).toHaveBeenCalledWith({
      head: 0,
      anchor: 0,
    });
  });

  it("renders snippet library", () => {
    render(<EditorPanel {...defaultProps} />);
    expect(screen.getByTestId("snippet-library")).toBeInTheDocument();
  });
});
