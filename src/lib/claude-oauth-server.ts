import { CLIENT_ID, REDIRECT_URI } from "./claude-oauth";

// Server-side half of the subscription OAuth flow. Tokens live only here (in an
// httpOnly cookie) — they never reach client JavaScript. The code-exchange and
// refresh POSTs run server-side, so they aren't subject to browser CORS.
const TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";
const COOKIE_NAME = "sm_claude_sub";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface ServerTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function toTokens(data: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}): ServerTokens {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<ServerTokens> {
  const [authCode, state] = code.trim().split("#");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: authCode,
      state: state ?? verifier,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    throw new Error(`OAuth token exchange failed (${res.status})`);
  }
  return toTokens(await res.json());
}

export async function refreshTokens(
  refreshToken: string
): Promise<ServerTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });
  if (!res.ok) {
    throw new Error(`OAuth token refresh failed (${res.status})`);
  }
  return toTokens(await res.json());
}

export function readTokensFromRequest(req: Request): ServerTokens | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const entry = header
    .split(/; */)
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return null;
  const value = entry.slice(COOKIE_NAME.length + 1);
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function cookieAttributes(): string[] {
  const attrs = ["Path=/", "HttpOnly", "SameSite=Lax"];
  // localhost dev runs over http, where Secure cookies aren't sent.
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs;
}

export function buildSessionCookie(tokens: ServerTokens): string {
  const value = Buffer.from(JSON.stringify(tokens), "utf8").toString("base64");
  return [
    `${COOKIE_NAME}=${value}`,
    ...cookieAttributes(),
    `Max-Age=${COOKIE_MAX_AGE}`,
  ].join("; ");
}

export function buildClearCookie(): string {
  return [`${COOKIE_NAME}=`, ...cookieAttributes(), "Max-Age=0"].join("; ");
}
