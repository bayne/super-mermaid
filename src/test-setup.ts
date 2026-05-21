import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock clipboard API (not available in jsdom)
const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(window.navigator, "clipboard", {
  value: { writeText: clipboardWriteText, readText: vi.fn() },
  writable: true,
  configurable: true,
});
// Expose for tests to assert against
(globalThis as Record<string, unknown>).__clipboardWriteText = clipboardWriteText;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
}));

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

// Mock @vercel/analytics
vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => null,
}));

// Mock @vercel/speed-insights
vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => null,
}));
