import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  exchangeCodeForTokens,
  refreshTokens,
  readTokensFromRequest,
  buildSessionCookie,
  buildClearCookie,
  type ServerTokens,
} from "../claude-oauth-server";

const TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";

function tokenResponse(ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => ({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
    }),
  } as unknown as Response;
}

describe("claude-oauth-server", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("exchangeCodeForTokens", () => {
    it("splits code#state and returns server tokens", async () => {
      fetchMock.mockResolvedValue(tokenResponse());
      const before = Date.now();

      const tokens = await exchangeCodeForTokens("the-code#the-state", "verifier");

      expect(tokens.accessToken).toBe("access");
      expect(tokens.refreshToken).toBe("refresh");
      expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(TOKEN_URL);
      const body = JSON.parse(init.body);
      expect(body.grant_type).toBe("authorization_code");
      expect(body.code).toBe("the-code");
      expect(body.state).toBe("the-state");
      expect(body.code_verifier).toBe("verifier");
    });

    it("falls back to the verifier as state when no fragment is present", async () => {
      fetchMock.mockResolvedValue(tokenResponse());
      await exchangeCodeForTokens("bare-code", "verifier");
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.code).toBe("bare-code");
      expect(body.state).toBe("verifier");
    });

    it("throws when the exchange fails", async () => {
      fetchMock.mockResolvedValue(tokenResponse(false, 400));
      await expect(exchangeCodeForTokens("x", "v")).rejects.toThrow(
        "OAuth token exchange failed (400)"
      );
    });
  });

  describe("refreshTokens", () => {
    it("posts a refresh grant and returns new tokens", async () => {
      fetchMock.mockResolvedValue(tokenResponse());
      const tokens = await refreshTokens("old-refresh");

      expect(tokens.accessToken).toBe("access");
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.grant_type).toBe("refresh_token");
      expect(body.refresh_token).toBe("old-refresh");
    });

    it("throws when the refresh fails", async () => {
      fetchMock.mockResolvedValue(tokenResponse(false, 401));
      await expect(refreshTokens("x")).rejects.toThrow(
        "OAuth token refresh failed (401)"
      );
    });
  });

  describe("cookie helpers", () => {
    const tokens: ServerTokens = {
      accessToken: "a",
      refreshToken: "r",
      expiresAt: 1234567890,
    };

    it("round-trips tokens through a session cookie", () => {
      const setCookie = buildSessionCookie(tokens);
      expect(setCookie).toContain("sm_claude_sub=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Lax");

      const value = setCookie.split(";")[0];
      const req = new Request("http://localhost", {
        headers: { cookie: `other=1; ${value}` },
      });
      expect(readTokensFromRequest(req)).toEqual(tokens);
    });

    it("returns null when no cookie is present", () => {
      expect(readTokensFromRequest(new Request("http://localhost"))).toBeNull();
    });

    it("returns null when the session cookie is absent", () => {
      const req = new Request("http://localhost", {
        headers: { cookie: "other=1" },
      });
      expect(readTokensFromRequest(req)).toBeNull();
    });

    it("returns null for a corrupt cookie value", () => {
      const req = new Request("http://localhost", {
        headers: { cookie: "sm_claude_sub=not-base64-json" },
      });
      expect(readTokensFromRequest(req)).toBeNull();
    });

    it("builds an expiring clear cookie", () => {
      const clear = buildClearCookie();
      expect(clear).toContain("sm_claude_sub=;");
      expect(clear).toContain("Max-Age=0");
    });
  });
});
