import { describe, it, expect, beforeEach } from "vitest";
import {
  getClaudeAuth,
  setClaudeAuth,
  clearClaudeAuth,
  getSelectedModel,
  setSelectedModel,
  resolveModelId,
  DEFAULT_MODEL,
  MODELS,
  type ClaudeAuthConfig,
} from "../claude-auth";

describe("claude-auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no auth is stored", () => {
    expect(getClaudeAuth()).toBeNull();
  });

  it("stores and retrieves the subscription marker", () => {
    const config: ClaudeAuthConfig = {
      provider: "subscription",
      expiresAt: 1234567890,
    };
    setClaudeAuth(config);
    expect(getClaudeAuth()).toEqual(config);
  });

  it("never persists a secret to localStorage", () => {
    setClaudeAuth({ provider: "subscription", expiresAt: 1234567890 });
    setSelectedModel("opus-4-6");
    const dump = JSON.stringify(localStorage);
    expect(dump).not.toMatch(/sk-ant/);
    expect(dump).not.toMatch(/accessToken/);
    expect(dump).not.toMatch(/refreshToken/);
  });

  it("clears auth", () => {
    setClaudeAuth({ provider: "subscription", expiresAt: 1 });
    clearClaudeAuth();
    expect(getClaudeAuth()).toBeNull();
  });

  it("returns null for corrupted stored data", () => {
    localStorage.setItem("super-mermaid-claude-auth", "not-json");
    expect(getClaudeAuth()).toBeNull();
  });
});

describe("model selection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to the first model when none stored", () => {
    expect(getSelectedModel()).toBe(DEFAULT_MODEL);
  });

  it("stores and retrieves the selected model", () => {
    setSelectedModel("opus-4-6");
    expect(getSelectedModel()).toBe("opus-4-6");
  });

  it("ignores an unknown stored model", () => {
    localStorage.setItem("super-mermaid-claude-model", "not-a-model");
    expect(getSelectedModel()).toBe(DEFAULT_MODEL);
  });

  it("resolves a logical model to the Anthropic id", () => {
    expect(resolveModelId("opus-4-6")).toBe("claude-opus-4-6");
    expect(resolveModelId("sonnet-4-6")).toBe("claude-sonnet-4-6");
  });

  it("falls back to the first model for an unknown id", () => {
    expect(resolveModelId("nope")).toBe(MODELS[0].anthropic);
  });
});
