import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/mermaid-renderer", () => ({
  renderMermaid: vi.fn(),
}));

import { useMermaidRender } from "../use-mermaid-render";
import { renderMermaid } from "@/lib/mermaid-renderer";

const mockRenderMermaid = vi.mocked(renderMermaid);

describe("useMermaidRender", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it("returns empty result initially", () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "<svg/>",
      error: null,
      errorLine: null,
    });
    const { result } = renderHook(() => useMermaidRender("graph TD", false));
    expect(result.current).toEqual({
      svg: "",
      error: null,
      errorLine: null,
    });
  });

  it("renders after debounce", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "<svg>test</svg>",
      error: null,
      errorLine: null,
    });

    const { result } = renderHook(() =>
      useMermaidRender("graph TD\n  A --> B", false)
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.svg).toBe("<svg>test</svg>");
    expect(result.current.error).toBeNull();
  });

  it("passes dark theme when darkMode is true", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "<svg/>",
      error: null,
      errorLine: null,
    });

    renderHook(() => useMermaidRender("graph TD", true));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockRenderMermaid).toHaveBeenCalledWith("graph TD", "dark");
  });

  it("passes default theme when darkMode is false", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "<svg/>",
      error: null,
      errorLine: null,
    });

    renderHook(() => useMermaidRender("graph TD", false));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockRenderMermaid).toHaveBeenCalledWith("graph TD", "default");
  });

  it("preserves last valid svg when error occurs", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "<svg>good</svg>",
      error: null,
      errorLine: null,
    });

    const { result, rerender } = renderHook(
      ({ content }) => useMermaidRender(content, false),
      { initialProps: { content: "graph TD\n  A --> B" } }
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.svg).toBe("<svg>good</svg>");

    mockRenderMermaid.mockResolvedValue({
      svg: "",
      error: "Parse error on line 2",
      errorLine: 2,
    });

    rerender({ content: "bad content" });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.svg).toBe("<svg>good</svg>");
    expect(result.current.error).toBe("Parse error on line 2");
    expect(result.current.errorLine).toBe(2);
  });

  it("debounces rapid content changes", async () => {
    mockRenderMermaid.mockResolvedValue({
      svg: "<svg/>",
      error: null,
      errorLine: null,
    });

    const { rerender } = renderHook(
      ({ content }) => useMermaidRender(content, false),
      { initialProps: { content: "a" } }
    );

    rerender({ content: "ab" });
    rerender({ content: "abc" });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockRenderMermaid).toHaveBeenCalledTimes(1);
    expect(mockRenderMermaid).toHaveBeenCalledWith("abc", "default");
  });
});
