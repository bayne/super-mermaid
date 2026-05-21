import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("@/lib/mermaid-renderer", () => ({
  renderMermaid: vi.fn(),
}));

import { PreviewPanel } from "../preview-panel";
import { renderMermaid } from "@/lib/mermaid-renderer";

const mockRenderMermaid = vi.mocked(renderMermaid);

describe("PreviewPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it("shows placeholder text for empty content", () => {
    mockRenderMermaid.mockResolvedValue({ svg: "", error: null });
    render(<PreviewPanel content="" />);
    expect(
      screen.getByText("Start typing to see your diagram")
    ).toBeInTheDocument();
  });

  it("renders SVG after debounced render", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: '<svg data-testid="diagram">test</svg>',
      error: null,
    });

    render(<PreviewPanel content="graph TD\n  A --> B" />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // The SVG is injected via dangerouslySetInnerHTML
    expect(mockRenderMermaid).toHaveBeenCalledWith(expect.stringContaining("graph TD"));
  });

  it("shows error banner when render fails", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "",
      error: "Parse error at line 1",
    });

    render(<PreviewPanel content="invalid" />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Parse error at line 1")).toBeInTheDocument();
  });

  it("does not show placeholder when error exists", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "",
      error: "Parse error",
    });

    render(<PreviewPanel content="bad" />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(
      screen.queryByText("Start typing to see your diagram")
    ).not.toBeInTheDocument();
  });

  it("clears error when render succeeds", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "",
      error: "Parse error",
    });

    const { rerender } = render(<PreviewPanel content="bad" />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Parse error")).toBeInTheDocument();

    mockRenderMermaid.mockResolvedValue({
      svg: "<svg>good</svg>",
      error: null,
    });

    rerender(<PreviewPanel content="good" />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText("Parse error")).not.toBeInTheDocument();
  });
});
