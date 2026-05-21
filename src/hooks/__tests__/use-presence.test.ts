import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { usePresence } from "../use-presence";
import type { UserIdentity } from "@/lib/user-identity";

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  untrack: ReturnType<typeof vi.fn>;
  presenceState: ReturnType<typeof vi.fn>;
  _trigger: (type: string, event: string, payload: unknown) => void;
}

function createMockChannel(): MockChannel {
  const handlers: Record<string, Record<string, (payload: unknown) => void>> =
    {};

  const ch: MockChannel = {
    on: vi.fn(
      (
        type: string,
        filter: { event: string },
        cb: (payload: unknown) => void
      ) => {
        if (!handlers[type]) handlers[type] = {};
        handlers[type][filter.event] = cb;
        return ch;
      }
    ),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    send: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    presenceState: vi.fn(() => ({})),
    _trigger(type: string, event: string, payload: unknown) {
      handlers[type]?.[event]?.(payload);
    },
  };
  return ch;
}

const mockUser: UserIdentity = {
  userId: "user-1",
  name: "Alice",
  color: "#E63946",
};

describe("usePresence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("returns empty users when channel is null", () => {
    const { result } = renderHook(() => usePresence(null, mockUser));
    expect(result.current.onlineUsers).toEqual([]);
  });

  it("tracks user presence on mount", () => {
    const channel = createMockChannel();
    renderHook(() => usePresence(channel as any, mockUser));

    expect(channel.track).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        name: "Alice",
        color: "#E63946",
      })
    );
  });

  it("untracks on unmount", () => {
    const channel = createMockChannel();
    const { unmount } = renderHook(() => usePresence(channel as any, mockUser));
    unmount();
    expect(channel.untrack).toHaveBeenCalled();
  });

  it("updates onlineUsers on presence sync", () => {
    const channel = createMockChannel();
    const users = {
      key1: [
        {
          userId: "user-1",
          name: "Alice",
          color: "#E63946",
          onlineSince: "2024-01-01",
        },
      ],
      key2: [
        {
          userId: "user-2",
          name: "Bob",
          color: "#457B9D",
          onlineSince: "2024-01-01",
        },
      ],
    };
    channel.presenceState.mockReturnValue(users);

    const { result } = renderHook(() => usePresence(channel as any, mockUser));

    act(() => {
      channel._trigger("presence", "sync", {});
    });

    expect(result.current.onlineUsers).toHaveLength(2);
  });
});
