import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderMermaid } from "../mermaid-renderer";

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
    expect(result).toEqual({ svg: "", error: null });
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("returns empty svg for whitespace input", async () => {
    const result = await renderMermaid("   ");
    expect(result).toEqual({ svg: "", error: null });
  });

  it("returns svg on successful render", async () => {
    mockRender.mockResolvedValue({ svg: "<svg>diagram</svg>" } as never);

    const result = await renderMermaid("graph TD\n  A --> B");
    expect(result).toEqual({ svg: "<svg>diagram</svg>", error: null });
  });

  it("returns error on parse failure", async () => {
    mockRender.mockRejectedValue(new Error("Parse error at line 1"));

    const result = await renderMermaid("invalid content");
    expect(result).toEqual({ svg: "", error: "Parse error at line 1" });
  });

  it("returns generic error for non-Error throws", async () => {
    mockRender.mockRejectedValue("string error");

    const result = await renderMermaid("invalid content");
    expect(result).toEqual({ svg: "", error: "Failed to parse diagram" });
  });

  it("uses unique ids for each render call", async () => {
    mockRender.mockResolvedValue({ svg: "<svg/>" } as never);

    await renderMermaid("graph TD\n  A --> B");
    await renderMermaid("graph TD\n  C --> D");

    const id1 = mockRender.mock.calls[0][0];
    const id2 = mockRender.mock.calls[1][0];
    expect(id1).not.toBe(id2);
  });
});
