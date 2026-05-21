import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreviewPanel } from "../preview-panel";

describe("PreviewPanel", () => {
  it("shows placeholder text when no svg and no error", () => {
    render(<PreviewPanel svg="" error={null} />);
    expect(
      screen.getByText("Start typing to see your diagram")
    ).toBeInTheDocument();
  });

  it("renders SVG content", () => {
    render(
      <PreviewPanel svg='<svg data-testid="diagram">test</svg>' error={null} />
    );
    expect(
      screen.queryByText("Start typing to see your diagram")
    ).not.toBeInTheDocument();
  });

  it("shows error banner", () => {
    render(<PreviewPanel svg="" error="Parse error at line 1" />);
    expect(screen.getByText("Parse error at line 1")).toBeInTheDocument();
  });

  it("does not show placeholder when error exists", () => {
    render(<PreviewPanel svg="" error="Parse error" />);
    expect(
      screen.queryByText("Start typing to see your diagram")
    ).not.toBeInTheDocument();
  });

  it("shows both svg and error when both present", () => {
    render(<PreviewPanel svg="<svg>good</svg>" error="warning" />);
    expect(screen.getByText("warning")).toBeInTheDocument();
  });
});
