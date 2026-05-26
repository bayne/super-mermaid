const STORAGE_KEY = "super-mermaid-claude-auth";
const MODEL_KEY = "super-mermaid-claude-model";

/**
 * Client-side marker for a Claude.ai (Pro/Max) subscription session — the only
 * supported provider. The OAuth tokens live solely in an httpOnly cookie
 * (see claude-oauth-server.ts) and the chat is proxied server-side, so an XSS in
 * the untrusted shared diagram can't read a credential — only drive the proxy.
 * `expiresAt` (epoch ms) is kept just to show connection status.
 */
export interface SubscriptionAuth {
  provider: "subscription";
  expiresAt: number;
}

export type ClaudeAuthConfig = SubscriptionAuth;
export type Provider = ClaudeAuthConfig["provider"];

/**
 * Model selection is intentionally decoupled from auth: a model is picked by its
 * logical id and resolved to the concrete Anthropic id at request time.
 */
export const MODELS = [
  { id: "sonnet-4-6", label: "Sonnet 4.6", anthropic: "claude-sonnet-4-6" },
  { id: "opus-4-6", label: "Opus 4.6", anthropic: "claude-opus-4-6" },
  {
    id: "haiku-4-5",
    label: "Haiku 4.5",
    anthropic: "claude-haiku-4-5-20251001",
  },
] as const;

export const DEFAULT_MODEL = MODELS[0].id;

export function resolveModelId(modelId: string): string {
  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
  return model.anthropic;
}

export function getClaudeAuth(): ClaudeAuthConfig | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as ClaudeAuthConfig;
  } catch {
    return null;
  }
}

export function setClaudeAuth(config: ClaudeAuthConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearClaudeAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSelectedModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  const stored = localStorage.getItem(MODEL_KEY);
  if (stored && MODELS.some((m) => m.id === stored)) return stored;
  return DEFAULT_MODEL;
}

export function setSelectedModel(modelId: string): void {
  localStorage.setItem(MODEL_KEY, modelId);
}
