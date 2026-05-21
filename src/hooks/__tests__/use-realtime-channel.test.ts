import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";

let subscribeCallback: ((status: string) => void) | null = null;
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((cb) => {
    subscribeCallback = cb;
    return mockChannel;
  }),
  unsubscribe: vi.fn(),
  send: vi.fn(),
  track: vi.fn(),
  untrack: vi.fn(),
  presenceState: vi.fn(() => ({})),
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

import { useRealtimeChannel } from "../use-realtime-channel";
import { supabase } from "@/lib/supabase";

describe("useRealtimeChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeCallback = null;
    cleanup();
  });

  it("returns null before subscription", () => {
    const { result } = renderHook(() => useRealtimeChannel("test-id"));
    expect(result.current).toBeNull();
  });

  it("creates channel with correct topic", () => {
    renderHook(() => useRealtimeChannel("abc123"));
    expect(supabase.channel).toHaveBeenCalledWith("diagram:abc123", {
      config: { broadcast: { self: false } },
    });
  });

  it("sets channel after SUBSCRIBED status", () => {
    const { result } = renderHook(() => useRealtimeChannel("test-id"));

    act(() => {
      subscribeCallback?.("SUBSCRIBED");
    });

    expect(result.current).toBe(mockChannel);
  });

  it("does not set channel for other statuses", () => {
    const { result } = renderHook(() => useRealtimeChannel("test-id"));

    act(() => {
      subscribeCallback?.("CONNECTING");
    });

    expect(result.current).toBeNull();
  });

  it("cleans up channel on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeChannel("test-id"));
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
