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

  it("stores and retrieves Anthropic auth", () => {
    const config: ClaudeAuthConfig = {
      provider: "anthropic",
      apiKey: "sk-ant-test123",
    };
    setClaudeAuth(config);
    expect(getClaudeAuth()).toEqual(config);
  });

  it("stores and retrieves Bedrock auth", () => {
    const config: ClaudeAuthConfig = {
      provider: "bedrock",
      accessKeyId: "AKIA...",
      secretAccessKey: "secret",
      region: "us-west-2",
    };
    setClaudeAuth(config);
    expect(getClaudeAuth()).toEqual(config);
  });

  it("stores Bedrock auth with session token", () => {
    const config: ClaudeAuthConfig = {
      provider: "bedrock",
      accessKeyId: "AKIA...",
      secretAccessKey: "secret",
      region: "us-east-1",
      sessionToken: "token123",
    };
    setClaudeAuth(config);
    expect(getClaudeAuth()).toEqual(config);
  });

  it("stores and retrieves the subscription marker", () => {
    const config: ClaudeAuthConfig = {
      provider: "subscription",
      expiresAt: 1234567890,
    };
    setClaudeAuth(config);
    expect(getClaudeAuth()).toEqual(config);
  });

  it("clears auth", () => {
    setClaudeAuth({ provider: "anthropic", apiKey: "sk-ant-test" });
    clearClaudeAuth();
    expect(getClaudeAuth()).toBeNull();
  });

  it("overwrites existing auth", () => {
    setClaudeAuth({ provider: "anthropic", apiKey: "sk-ant-old" });
    const newConfig: ClaudeAuthConfig = {
      provider: "bedrock",
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
      region: "eu-west-1",
    };
    setClaudeAuth(newConfig);
    expect(getClaudeAuth()).toEqual(newConfig);
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
    expect(resolveModelId("opus-4-6", "anthropic")).toBe("claude-opus-4-6");
  });

  it("resolves a logical model to the Bedrock id", () => {
    expect(resolveModelId("opus-4-6", "bedrock")).toBe(
      "us.anthropic.claude-opus-4-6-v1[1m]"
    );
  });

  it("uses the Anthropic id for the subscription provider", () => {
    expect(resolveModelId("sonnet-4-6", "subscription")).toBe(
      "claude-sonnet-4-6"
    );
  });

  it("falls back to the first model for an unknown id", () => {
    expect(resolveModelId("nope", "anthropic")).toBe(MODELS[0].anthropic);
  });
});
