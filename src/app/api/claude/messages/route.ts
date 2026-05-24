import { resolveModelId } from "@/lib/claude-auth";
import {
  readTokensFromRequest,
  refreshTokens,
  buildSessionCookie,
} from "@/lib/claude-oauth-server";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 4096;

// The Messages API only honors a subscription bearer token when the system
// prompt opens with this exact line (Claude's CLI identity).
const CLI_SYSTEM_PREFIX =
  "You are Claude Code, Anthropic's official CLI for Claude.";

interface MessagesBody {
  model: string;
  system: string;
  // content is a plain string or an array of content blocks (for tool use).
  messages: Array<{ role: "user" | "assistant"; content: unknown }>;
  tools?: unknown[];
}

/**
 * Server-side proxy for the subscription provider: the OAuth token stays in the
 * httpOnly cookie, gets refreshed here when near expiry, and the upstream SSE
 * stream is piped straight back to the browser.
 */
export async function POST(req: Request): Promise<Response> {
  let tokens = readTokensFromRequest(req);
  if (!tokens) {
    return jsonError("Not signed in to a Claude subscription", 401);
  }

  let body: MessagesBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  let refreshedCookie: string | null = null;
  if (tokens.expiresAt - Date.now() < 60_000) {
    try {
      tokens = await refreshTokens(tokens.refreshToken);
      refreshedCookie = buildSessionCookie(tokens);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Token refresh failed", 401);
    }
  }

  const upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.accessToken}`,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "oauth-2025-04-20",
    },
    body: JSON.stringify({
      model: resolveModelId(body.model, "subscription"),
      max_tokens: MAX_TOKENS,
      system: [
        { type: "text", text: CLI_SYSTEM_PREFIX },
        { type: "text", text: body.system },
      ],
      messages: body.messages,
      ...(body.tools?.length ? { tools: body.tools } : {}),
      stream: true,
    }),
  });

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
  });
  if (refreshedCookie) headers.set("Set-Cookie", refreshedCookie);

  return new Response(upstream.body, { status: upstream.status, headers });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
