const STORAGE_KEY = "super-mermaid-claude-auth";
const MODEL_KEY = "super-mermaid-claude-model";

export interface AnthropicAuth {
  provider: "anthropic";
  apiKey: string;
}

export interface BedrockAuth {
  provider: "bedrock";
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

/**
 * Client-side marker for a Claude.ai (Pro/Max) subscription session. The actual
 * OAuth tokens live in an httpOnly cookie managed server-side (see
 * claude-oauth-server.ts), never in localStorage. `expiresAt` (epoch ms) is kept
 * only to show connection status; the server owns refresh.
 */
export interface SubscriptionAuth {
  provider: "subscription";
  expiresAt: number;
}

export type ClaudeAuthConfig = AnthropicAuth | BedrockAuth | SubscriptionAuth;
export type Provider = ClaudeAuthConfig["provider"];

/**
 * Model selection is intentionally decoupled from auth: a model is picked by its
 * logical id and resolved to the concrete id the active provider expects. The
 * `anthropic` id is also used for the subscription provider (both hit the
 * Anthropic Messages API).
 */
export const MODELS = [
  {
    id: "sonnet-4-6",
    label: "Sonnet 4.6",
    anthropic: "claude-sonnet-4-6",
    bedrock: "us.anthropic.claude-sonnet-4-6-v1:0",
  },
  {
    id: "opus-4-6",
    label: "Opus 4.6",
    anthropic: "claude-opus-4-6",
    bedrock: "us.anthropic.claude-opus-4-6-v1[1m]",
  },
  {
    id: "haiku-4-5",
    label: "Haiku 4.5",
    anthropic: "claude-haiku-4-5-20251001",
    bedrock: "us.anthropic.claude-haiku-4-5-v1:0",
  },
] as const;

export const DEFAULT_MODEL = MODELS[0].id;

export function resolveModelId(modelId: string, provider: Provider): string {
  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
  return provider === "bedrock" ? model.bedrock : model.anthropic;
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
