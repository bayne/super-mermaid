import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
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
    cleanup();
  });

  it("returns channel immediately so consumers can register callbacks before subscribe", () => {
    const { result } = renderHook(() => useRealtimeChannel("test-id"));
    expect(result.current).toBe(mockChannel);
  });

  it("creates channel with correct topic", () => {
    renderHook(() => useRealtimeChannel("abc123"));
    expect(supabase.channel).toHaveBeenCalledWith("diagram:abc123", {
      config: { broadcast: { self: false } },
    });
  });

  it("does not subscribe (subscription is managed externally)", () => {
    renderHook(() => useRealtimeChannel("test-id"));
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  it("cleans up channel on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeChannel("test-id"));
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
