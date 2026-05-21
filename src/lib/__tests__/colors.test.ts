import { describe, it, expect } from "vitest";
import { assignColor, randomColor, COLORS } from "../colors";

describe("COLORS", () => {
  it("has 10 entries", () => {
    expect(COLORS).toHaveLength(10);
  });

  it("contains valid hex colors", () => {
    for (const color of COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("assignColor", () => {
  it("returns a color from the palette", () => {
    const color = assignColor("user-123");
    expect(COLORS).toContain(color);
  });

  it("is deterministic for the same userId", () => {
    const a = assignColor("test-user");
    const b = assignColor("test-user");
    expect(a).toBe(b);
  });

  it("produces different colors for different userIds", () => {
    const colors = new Set(
      Array.from({ length: 50 }, (_, i) => assignColor(`user-${i}`))
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  it("handles empty string", () => {
    const color = assignColor("");
    expect(COLORS).toContain(color);
  });
});

describe("randomColor", () => {
  it("returns a color from the palette", () => {
    const color = randomColor();
    expect(COLORS).toContain(color);
  });
});
