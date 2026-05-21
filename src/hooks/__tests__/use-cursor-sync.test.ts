import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useCursorSync } from "../use-cursor-sync";
import type { UserIdentity } from "@/lib/user-identity";
import type { CursorUpdate } from "@/lib/types";

type BroadcastHandler = (payload: { payload: CursorUpdate }) => void;
type PresenceHandler = (event: { leftPresences: Array<Record<string, unknown>> }) => void;

function createMockChannel() {
  let broadcastHandler: BroadcastHandler | null = null;
  let leaveHandler: PresenceHandler | null = null;

  const ch = {
    on: vi.fn(
      (
        type: string,
        filter: { event: string },
        cb: BroadcastHandler | PresenceHandler
      ) => {
        if (type === "broadcast" && filter.event === "cursor_update") {
          broadcastHandler = cb as BroadcastHandler;
        }
        if (type === "presence" && filter.event === "leave") {
          leaveHandler = cb as PresenceHandler;
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
    _triggerCursor(cursor: CursorUpdate) {
      broadcastHandler?.({ payload: cursor });
    },
    _triggerLeave(leftPresences: Array<Record<string, unknown>>) {
      leaveHandler?.({ leftPresences });
    },
  };
  return ch;
}

const mockUser: UserIdentity = {
  userId: "user-1",
  name: "Alice",
  color: "#E63946",
};

describe("useCursorSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    cleanup();
  });

  it("returns empty remoteCursors when channel is null", () => {
    const { result } = renderHook(() => useCursorSync(null, mockUser));
    expect(result.current.remoteCursors.size).toBe(0);
  });

  it("updates remoteCursors on cursor_update broadcast", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() => useCursorSync(channel as any, mockUser));

    const cursor: CursorUpdate = {
      userId: "user-2",
      position: 10,
      selectionHead: 10,
      selectionAnchor: 10,
      color: "#457B9D",
      name: "Bob",
    };

    act(() => {
      channel._triggerCursor(cursor);
    });

    expect(result.current.remoteCursors.get("user-2")).toEqual(cursor);
  });

  it("removes cursors on presence leave", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() => useCursorSync(channel as any, mockUser));

    act(() => {
      channel._triggerCursor({
        userId: "user-2",
        position: 5,
        selectionHead: 5,
        selectionAnchor: 5,
        color: "#457B9D",
        name: "Bob",
      });
    });

    expect(result.current.remoteCursors.size).toBe(1);

    act(() => {
      channel._triggerLeave([{ userId: "user-2" }]);
    });

    expect(result.current.remoteCursors.size).toBe(0);
  });

  it("broadcastCursor sends throttled cursor update", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() => useCursorSync(channel as any, mockUser));

    act(() => {
      result.current.broadcastCursor({ head: 10, anchor: 10 });
    });

    // Not sent immediately
    expect(channel.send).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(channel.send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "cursor_update",
      payload: expect.objectContaining({
        userId: "user-1",
        position: 10,
        color: "#E63946",
        name: "Alice",
      }),
    });
  });

  it("throttles rapid cursor updates", () => {
    const channel = createMockChannel();
    const { result } = renderHook(() => useCursorSync(channel as any, mockUser));

    act(() => {
      result.current.broadcastCursor({ head: 1, anchor: 1 });
      result.current.broadcastCursor({ head: 2, anchor: 2 });
      result.current.broadcastCursor({ head: 3, anchor: 3 });
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Only one send with the last cursor position
    expect(channel.send).toHaveBeenCalledTimes(1);
    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ position: 3 }),
      })
    );
  });
});
