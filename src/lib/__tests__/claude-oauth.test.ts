import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthorization,
  exchangeCode,
  clearSubscriptionSession,
} from "../claude-oauth";

describe("claude-oauth (client)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("createAuthorization", () => {
    it("builds a PKCE authorize URL and returns the verifier", async () => {
      const { url, verifier } = await createAuthorization();
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        "https://claude.ai/oauth/authorize"
      );
      expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
      expect(parsed.searchParams.get("client_id")).toBeTruthy();
      expect(parsed.searchParams.get("code_challenge")).toBeTruthy();
      expect(parsed.searchParams.get("state")).toBe(verifier);
    });

    it("produces a unique verifier each call", async () => {
      const a = await createAuthorization();
      const b = await createAuthorization();
      expect(a.verifier).not.toBe(b.verifier);
    });
  });

  describe("exchangeCode", () => {
    it("posts the code and verifier to the server route and returns a marker", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ expiresAt: 999 }),
      } as unknown as Response);

      const auth = await exchangeCode("the-code#state", "verifier");

      expect(auth).toEqual({ provider: "subscription", expiresAt: 999 });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/claude/oauth");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({
        code: "the-code#state",
        verifier: "verifier",
      });
    });

    it("throws the server error message when the exchange fails", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "bad code" } }),
      } as unknown as Response);

      await expect(exchangeCode("x", "v")).rejects.toThrow("bad code");
    });

    it("falls back to a generic message when no error body is present", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("no body");
        },
      } as unknown as Response);

      await expect(exchangeCode("x", "v")).rejects.toThrow("Sign-in failed (500)");
    });
  });

  describe("clearSubscriptionSession", () => {
    it("sends a DELETE to the oauth route", async () => {
      fetchMock.mockResolvedValue({ ok: true } as unknown as Response);
      await clearSubscriptionSession();
      expect(fetchMock).toHaveBeenCalledWith("/api/claude/oauth", {
        method: "DELETE",
      });
    });

    it("swallows network errors", async () => {
      fetchMock.mockRejectedValue(new Error("offline"));
      await expect(clearSubscriptionSession()).resolves.toBeUndefined();
    });
  });
});
