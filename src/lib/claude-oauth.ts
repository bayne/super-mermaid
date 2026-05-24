import type { SubscriptionAuth } from "./claude-auth";

// Public OAuth client used by Claude's first-party CLI. The authorize step (and
// PKCE) runs in the browser, but the code exchange and token refresh happen on
// our own server (see claude-oauth-server.ts) — Anthropic's token endpoint
// sends no CORS headers, so the browser can't call it directly.
export const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
export const REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback";
const AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
const SCOPES = "org:create_api_key user:profile user:inference";

export interface PendingAuthorization {
  /** PKCE verifier — must be retained until the user pastes back their code. */
  verifier: string;
  /** URL to open so the user can authorize and copy back an auth code. */
  url: string;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Builds an authorize URL plus the PKCE verifier needed to redeem the code. */
export async function createAuthorization(): Promise<PendingAuthorization> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const challenge = base64url(new Uint8Array(digest));

  const params = new URLSearchParams({
    code: "true",
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: verifier,
  });

  return { verifier, url: `${AUTHORIZE_URL}?${params.toString()}` };
}

/**
 * Hands the pasted code + PKCE verifier to our server route, which performs the
 * token exchange and stores the tokens in an httpOnly cookie. Only a marker
 * (the expiry) comes back to the browser.
 */
export async function exchangeCode(
  code: string,
  verifier: string
): Promise<SubscriptionAuth> {
  const res = await fetch("/api/claude/oauth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, verifier }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message || `Sign-in failed (${res.status})`);
  }
  const { expiresAt } = (await res.json()) as { expiresAt: number };
  return { provider: "subscription", expiresAt };
}

/** Clears the server-side subscription session cookie. */
export async function clearSubscriptionSession(): Promise<void> {
  await fetch("/api/claude/oauth", { method: "DELETE" }).catch(() => {});
}
