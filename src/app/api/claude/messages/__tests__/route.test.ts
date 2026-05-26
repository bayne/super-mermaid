import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { buildSessionCookie } from "@/lib/claude-oauth-server";

const TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";
const MESSAGES_URL = "https://api.anthropic.com/v1/messages";

function streamResponse(text = "data: hi\n\n", status = 200) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  return {
    status,
    headers: new Headers({ "content-type": "text/event-stream" }),
    body,
  } as unknown as Response;
}

function messagesRequest(cookie: string | null, extra: object = {}) {
  return new Request("http://localhost/api/claude/messages", {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body: JSON.stringify({
      model: "sonnet-4-6",
      system: "diagram context",
      messages: [{ role: "user", content: "hi" }],
      ...extra,
    }),
  });
}

function subCookie(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}) {
  return buildSessionCookie(tokens).split(";")[0];
}

describe("POST /api/claude/messages", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("returns 401 when there is no session cookie", async () => {
    const res = await POST(messagesRequest(null));
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toContain("Not signed in");
  });

  it("returns 400 for an invalid request body", async () => {
    const cookie = subCookie({
      accessToken: "tok",
      refreshToken: "ref",
      expiresAt: Date.now() + 600_000,
    });
    const req = new Request("http://localhost/api/claude/messages", {
      method: "POST",
      headers: { cookie },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("proxies to Anthropic with a bearer token and CLI system prefix", async () => {
    fetchMock.mockResolvedValue(streamResponse());
    const cookie = subCookie({
      accessToken: "tok",
      refreshToken: "ref",
      expiresAt: Date.now() + 600_000,
    });

    const res = await POST(messagesRequest(cookie));

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(MESSAGES_URL);
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.headers["anthropic-beta"]).toBe("oauth-2025-04-20");
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe("claude-sonnet-4-6");
    expect(sent.system[0].text).toBe(
      "You are Claude Code, Anthropic's official CLI for Claude."
    );
    expect(sent.system[1].text).toBe("diagram context");
  });

  it("forwards tools to Anthropic when provided", async () => {
    fetchMock.mockResolvedValue(streamResponse());
    const cookie = subCookie({
      accessToken: "tok",
      refreshToken: "ref",
      expiresAt: Date.now() + 600_000,
    });

    const tools = [{ name: "update_editor", description: "d", input_schema: {} }];
    await POST(messagesRequest(cookie, { tools }));

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.tools).toEqual(tools);
  });

  it("refreshes a near-expired token and re-sets the cookie", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === TOKEN_URL) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "fresh",
            refresh_token: "fresh-ref",
            expires_in: 3600,
          }),
        } as unknown as Response);
      }
      return Promise.resolve(streamResponse());
    });

    const cookie = subCookie({
      accessToken: "old",
      refreshToken: "ref",
      expiresAt: Date.now() + 1000,
    });

    const res = await POST(messagesRequest(cookie));

    expect(fetchMock.mock.calls[0][0]).toBe(TOKEN_URL);
    expect(res.headers.get("set-cookie")).toContain("sm_claude_sub=");
    const messagesInit = fetchMock.mock.calls[1][1];
    expect(messagesInit.headers.Authorization).toBe("Bearer fresh");
  });

  it("returns 401 when the refresh fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response);

    const cookie = subCookie({
      accessToken: "old",
      refreshToken: "ref",
      expiresAt: Date.now() + 1000,
    });

    const res = await POST(messagesRequest(cookie));
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toContain("refresh failed");
  });
});
