import {
  exchangeCodeForTokens,
  buildSessionCookie,
  buildClearCookie,
} from "@/lib/claude-oauth-server";

// Exchanges a pasted authorization code for tokens and stashes them in an
// httpOnly cookie. Returns only the expiry so the client can show "connected".
export async function POST(req: Request): Promise<Response> {
  let code: string;
  let verifier: string;
  try {
    ({ code, verifier } = await req.json());
  } catch {
    return jsonError("Invalid request body", 400);
  }
  if (!code || !verifier) {
    return jsonError("Missing code or verifier", 400);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier);
    return new Response(JSON.stringify({ expiresAt: tokens.expiresAt }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": buildSessionCookie(tokens),
      },
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Sign-in failed", 400);
  }
}

export async function DELETE(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": buildClearCookie() },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
