import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDarkMode } from "../use-dark-mode";

describe("useDarkMode", () => {
  let listeners: Array<() => void>;
  let matchesValue: boolean;

  beforeEach(() => {
    listeners = [];
    matchesValue = false;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: matchesValue,
        addEventListener: (_event: string, cb: () => void) => {
          listeners.push(cb);
        },
        removeEventListener: (_event: string, cb: () => void) => {
          listeners = listeners.filter((l) => l !== cb);
        },
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when system is in light mode", () => {
    matchesValue = false;
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);
  });

  it("returns true when system is in dark mode", () => {
    matchesValue = true;
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(true);
  });

  it("updates when dark mode changes", () => {
    matchesValue = false;
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);

    act(() => {
      matchesValue = true;
      for (const listener of listeners) listener();
    });

    expect(result.current).toBe(true);
  });

  it("cleans up listener on unmount", () => {
    const { unmount } = renderHook(() => useDarkMode());
    expect(listeners.length).toBeGreaterThan(0);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
