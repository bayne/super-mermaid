import { describe, it, expect, beforeEach } from "vitest";
import {
  getClaudeAuth,
  setClaudeAuth,
  clearClaudeAuth,
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
      model: "claude-sonnet-4-6",
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
      model: "us.anthropic.claude-sonnet-4-6-v1:0",
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
      model: "us.anthropic.claude-sonnet-4-6-v1:0",
    };
    setClaudeAuth(config);
    expect(getClaudeAuth()).toEqual(config);
  });

  it("clears auth", () => {
    setClaudeAuth({ provider: "anthropic", apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });
    clearClaudeAuth();
    expect(getClaudeAuth()).toBeNull();
  });

  it("overwrites existing auth", () => {
    setClaudeAuth({ provider: "anthropic", apiKey: "sk-ant-old", model: "claude-sonnet-4-6" });
    const newConfig: ClaudeAuthConfig = {
      provider: "bedrock",
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
      region: "eu-west-1",
      model: "us.anthropic.claude-sonnet-4-6-v1:0",
    };
    setClaudeAuth(newConfig);
    expect(getClaudeAuth()).toEqual(newConfig);
  });

  it("returns null for corrupted stored data", () => {
    localStorage.setItem("super-mermaid-claude-auth", "not-json");
    expect(getClaudeAuth()).toBeNull();
  });
});
