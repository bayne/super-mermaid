import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mock-nanoid-1"),
}));

vi.mock("../colors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../colors")>();
  return {
    ...actual,
    randomColor: vi.fn(() => "#E63946"),
  };
});

import { getUserIdentity, updateUserIdentity } from "../user-identity";

describe("getUserIdentity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates new identity when localStorage is empty", () => {
    const identity = getUserIdentity();
    expect(identity).toEqual({
      userId: "mock-nanoid-1",
      name: "Anonymous",
      color: "#E63946",
    });
  });

  it("persists identity to localStorage", () => {
    getUserIdentity();
    const stored = JSON.parse(localStorage.getItem("super-mermaid-user")!);
    expect(stored.userId).toBe("mock-nanoid-1");
  });

  it("returns stored identity from localStorage", () => {
    const existing = { userId: "existing-id", name: "Alice", color: "#457B9D" };
    localStorage.setItem("super-mermaid-user", JSON.stringify(existing));

    const identity = getUserIdentity();
    expect(identity).toEqual(existing);
  });

  it("handles corrupted localStorage JSON", () => {
    localStorage.setItem("super-mermaid-user", "not-json{{{");

    const identity = getUserIdentity();
    expect(identity.userId).toBe("mock-nanoid-1");
    expect(identity.name).toBe("Anonymous");
  });
});

describe("updateUserIdentity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("merges partial updates", () => {
    getUserIdentity();
    const updated = updateUserIdentity({ name: "Bob" });

    expect(updated.name).toBe("Bob");
    expect(updated.userId).toBe("mock-nanoid-1");
    expect(updated.color).toBe("#E63946");
  });

  it("persists updates to localStorage", () => {
    getUserIdentity();
    updateUserIdentity({ color: "#2A9D8F" });

    const stored = JSON.parse(localStorage.getItem("super-mermaid-user")!);
    expect(stored.color).toBe("#2A9D8F");
  });
});
