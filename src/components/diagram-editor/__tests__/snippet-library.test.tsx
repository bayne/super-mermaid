import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SnippetLibrary } from "../snippet-library";

describe("SnippetLibrary", () => {
  const defaultProps = {
    content: "graph TD\n  A --> B",
    cursorLine: 1,
    onInsert: vi.fn(),
  };

  it("renders snippet buttons", () => {
    render(<SnippetLibrary {...defaultProps} />);
    expect(screen.getByText("Arrow -->")).toBeInTheDocument();
    expect(screen.getByText("Subgraph")).toBeInTheDocument();
  });

  it("calls onInsert when snippet is clicked", () => {
    render(<SnippetLibrary {...defaultProps} />);
    fireEvent.click(screen.getByText("Arrow -->"));
    expect(defaultProps.onInsert).toHaveBeenCalledWith("A --> B");
  });

  it("shows starters first when content is empty", () => {
    render(
      <SnippetLibrary {...defaultProps} content="" cursorLine={1} />
    );
    const buttons = screen.getAllByRole("button");
    const firstLabels = buttons.slice(0, 8).map((b) => b.textContent);
    expect(firstLabels).toContain("Flowchart");
    expect(firstLabels).toContain("Sequence Diagram");
  });

  it("shows graph snippets first when editing a flowchart", () => {
    render(
      <SnippetLibrary
        {...defaultProps}
        content="graph TD\n  A --> B"
        cursorLine={2}
      />
    );
    const buttons = screen.getAllByRole("button");
    const firstFew = buttons.slice(0, 5).map((b) => b.textContent);
    const hasGraphSnippet = firstFew.some(
      (label) =>
        label?.includes("Node") ||
        label?.includes("Arrow") ||
        label?.includes("Subgraph")
    );
    expect(hasGraphSnippet).toBe(true);
  });
});
