import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import type { ContentUpdate } from "@/lib/types";

type BroadcastHandler = (payload: { payload: ContentUpdate | { title: string } }) => void;

const mockFrom = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
};

function createMockChannel() {
  const handlers: Record<string, BroadcastHandler> = {};

  const ch = {
    on: vi.fn(
      (
        type: string,
        filter: { event: string },
        cb: BroadcastHandler
      ) => {
        if (type === "broadcast") {
          handlers[filter.event] = cb;
        }
        return ch;
      }
    ),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    send: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    presenceState: vi.fn(() => ({})),
    _trigger(event: string, payload: ContentUpdate | { title: string }) {
      handlers[event]?.({ payload });
    },
  };
  return ch;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
    from: vi.fn(() => mockFrom),
  },
}));

import { useDiagramSync } from "../use-diagram-sync";

describe("useDiagramSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFrom.single.mockResolvedValue({ data: null, error: null });
    cleanup();
  });

  it("starts with default content", () => {
    const { result } = renderHook(() =>
      useDiagramSync(null, "test-id", "default content")
    );
    expect(result.current.content).toBe("default content");
    expect(result.current.title).toBe("Untitled Diagram");
  });

  it("loads content from DB on mount", async () => {
    mockFrom.single.mockResolvedValue({
      data: { content: "db content", title: "DB Title" },
      error: null,
    });

    const { result } = renderHook(() =>
      useDiagramSync(null, "test-id", "default")
    );

    await vi.waitFor(() => {
      expect(result.current.content).toBe("db content");
    });
    expect(result.current.title).toBe("DB Title");
  });

  it("creates new diagram when DB returns null", async () => {
    mockFrom.single.mockResolvedValue({ data: null, error: null });

    renderHook(() => useDiagramSync(null, "test-id", "default content"));

    await vi.waitFor(() => {
      expect(mockFrom.insert).toHaveBeenCalledWith({
        id: "test-id",
        title: "Untitled Diagram",
        content: "default content",
      });
    });
  });

  it("updates content locally on updateContent", () => {
    const { result } = renderHook(() =>
      useDiagramSync(null, "test-id", "initial")
    );

    act(() => {
      result.current.updateContent("new content");
    });

    expect(result.current.content).toBe("new content");
  });

  it("broadcasts content with 300ms debounce", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() =>
      useDiagramSync(channel as any, "test-id", "initial")
    );

    act(() => {
      result.current.updateContent("updated");
    });

    expect(channel.send).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "broadcast",
        event: "content_update",
      })
    );
  });

  it("saves to DB with 2000ms debounce", async () => {
    mockFrom.single.mockResolvedValue({
      data: { content: "existing", title: "Title" },
      error: null,
    });

    const { result } = renderHook(() =>
      useDiagramSync(null, "test-id", "initial")
    );

    await vi.waitFor(() => {
      expect(result.current.content).toBe("existing");
    });

    act(() => {
      result.current.updateContent("new value");
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await vi.waitFor(() => {
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({ content: "new value" })
      );
    });
  });

  it("receives remote content updates", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() =>
      useDiagramSync(channel as any, "test-id", "initial")
    );

    act(() => {
      channel._trigger("content_update", {
        userId: "remote",
        content: "remote content",
        timestamp: Date.now(),
      });
    });

    expect(result.current.content).toBe("remote content");
  });

  it("receives remote title updates", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() =>
      useDiagramSync(channel as any, "test-id", "initial")
    );

    act(() => {
      channel._trigger("title_update", { title: "New Title" });
    });

    expect(result.current.title).toBe("New Title");
  });

  it("suppresses broadcast when triggered by remote update (echo prevention)", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() =>
      useDiagramSync(channel as any, "test-id", "initial")
    );

    // Simulate remote update
    act(() => {
      channel._trigger("content_update", {
        userId: "remote",
        content: "remote content",
        timestamp: Date.now(),
      });
    });

    // Immediately update content (within 100ms echo window)
    act(() => {
      result.current.updateContent("remote content modified");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should not broadcast because it's within the echo suppression window
    expect(channel.send).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: "content_update" })
    );
  });

  it("does not broadcast when channel is null", () => {
    const { result } = renderHook(() =>
      useDiagramSync(null, "test-id", "initial")
    );

    act(() => {
      result.current.updateContent("new value");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    // No crash, no broadcast
  });

  it("updateTitle broadcasts and saves", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() =>
      useDiagramSync(channel as any, "test-id", "initial")
    );

    act(() => {
      result.current.updateTitle("My Diagram");
    });

    expect(channel.send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "title_update",
      payload: { title: "My Diagram" },
    });

    expect(result.current.title).toBe("My Diagram");
  });

  it("updateTitle saves to DB after 1000ms debounce", async () => {
    const channel = createMockChannel();
    const { result } = renderHook(() =>
      useDiagramSync(channel as any, "test-id", "initial")
    );

    act(() => {
      result.current.updateTitle("New Title");
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await vi.waitFor(() => {
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New Title" })
      );
    });
  });

  it("updateTitle without channel does not crash", () => {
    const { result } = renderHook(() =>
      useDiagramSync(null, "test-id", "initial")
    );

    act(() => {
      result.current.updateTitle("Title");
    });

    expect(result.current.title).toBe("Title");
  });

  it("handles unsubscribe cleanup on channel listeners", () => {
    const channel = createMockChannel();
    channel.unsubscribe = vi.fn();
    const { unmount } = renderHook(() =>
      useDiagramSync(channel as any, "test-id", "initial")
    );

    unmount();
    // Should not throw
  });
});
