import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "../route";

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

function postRequest(body: unknown) {
  return new Request("http://localhost/api/claude/oauth", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/claude/oauth", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("exchanges the code and sets an httpOnly cookie", async () => {
    fetchMock.mockResolvedValue(tokenResponse());

    const res = await POST(postRequest({ code: "c#s", verifier: "v" }));

    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("sm_claude_sub=");
    expect(cookie).toContain("HttpOnly");
    const json = await res.json();
    expect(json.expiresAt).toBeGreaterThan(Date.now());
  });

  it("rejects a missing code or verifier", async () => {
    const res = await POST(postRequest({ code: "c" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("Missing");
  });

  it("rejects an invalid body", async () => {
    const res = await POST(
      new Request("http://localhost/api/claude/oauth", {
        method: "POST",
        body: "not json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns the exchange error on failure", async () => {
    fetchMock.mockResolvedValue(tokenResponse(false, 400));
    const res = await POST(postRequest({ code: "c", verifier: "v" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("exchange failed");
  });

  it("clears the cookie on DELETE", async () => {
    const res = await DELETE();
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
