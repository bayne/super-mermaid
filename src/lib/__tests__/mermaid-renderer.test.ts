import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderMermaid, parseErrorLine } from "../mermaid-renderer";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import mermaid from "mermaid";

const mockRender = vi.mocked(mermaid.render);

describe("renderMermaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty svg for empty input", async () => {
    const result = await renderMermaid("");
    expect(result).toEqual({ svg: "", error: null, errorLine: null });
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("returns empty svg for whitespace input", async () => {
    const result = await renderMermaid("   ");
    expect(result).toEqual({ svg: "", error: null, errorLine: null });
  });

  it("returns svg on successful render", async () => {
    mockRender.mockResolvedValue({ svg: "<svg>diagram</svg>" } as never);

    const result = await renderMermaid("graph TD\n  A --> B");
    expect(result).toEqual({
      svg: "<svg>diagram</svg>",
      error: null,
      errorLine: null,
    });
  });

  it("returns error with errorLine on parse failure", async () => {
    mockRender.mockRejectedValue(new Error("Parse error on line 5"));

    const result = await renderMermaid("invalid content");
    expect(result).toEqual({
      svg: "",
      error: "Parse error on line 5",
      errorLine: 5,
    });
  });

  it("returns null errorLine when line not in error message", async () => {
    mockRender.mockRejectedValue(new Error("Unknown syntax error"));

    const result = await renderMermaid("invalid content");
    expect(result).toEqual({
      svg: "",
      error: "Unknown syntax error",
      errorLine: null,
    });
  });

  it("returns generic error for non-Error throws", async () => {
    mockRender.mockRejectedValue("string error");

    const result = await renderMermaid("invalid content");
    expect(result).toEqual({
      svg: "",
      error: "Failed to parse diagram",
      errorLine: null,
    });
  });

  it("uses unique ids for each render call", async () => {
    mockRender.mockResolvedValue({ svg: "<svg/>" } as never);

    await renderMermaid("graph TD\n  A --> B");
    await renderMermaid("graph TD\n  C --> D");

    const id1 = mockRender.mock.calls[0][0];
    const id2 = mockRender.mock.calls[1][0];
    expect(id1).not.toBe(id2);
  });

  it("passes theme to mermaid.initialize", async () => {
    mockRender.mockResolvedValue({ svg: "<svg/>" } as never);

    await renderMermaid("graph TD\n  A --> B", "dark");
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "dark" })
    );
  });
});

describe("parseErrorLine", () => {
  it("extracts line number from 'line N' format", () => {
    expect(parseErrorLine("Parse error on line 5")).toBe(5);
  });

  it("extracts line number case-insensitively", () => {
    expect(parseErrorLine("Error at Line 12")).toBe(12);
  });

  it("returns null when no line number found", () => {
    expect(parseErrorLine("Unknown error")).toBeNull();
  });

  it("extracts first line number when multiple present", () => {
    expect(parseErrorLine("Error on line 3, expected line 7")).toBe(3);
  });
});
