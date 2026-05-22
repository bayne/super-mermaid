const STORAGE_KEY = "super-mermaid-claude-auth";

export interface AnthropicAuth {
  provider: "anthropic";
  apiKey: string;
  model: string;
}

export interface BedrockAuth {
  provider: "bedrock";
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
  model: string;
}

export const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { id: "claude-opus-4-6", label: "Opus 4.6" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
] as const;

export const BEDROCK_MODELS = [
  { id: "us.anthropic.claude-sonnet-4-6-v1:0", label: "Sonnet 4.6" },
  { id: "us.anthropic.claude-opus-4-6-v1[1m]", label: "Opus 4.6 1M" },
  { id: "us.anthropic.claude-haiku-4-5-v1:0", label: "Haiku 4.5" },
] as const;

export const DEFAULT_ANTHROPIC_MODEL = ANTHROPIC_MODELS[0].id;
export const DEFAULT_BEDROCK_MODEL = BEDROCK_MODELS[0].id;

export type ClaudeAuthConfig = AnthropicAuth | BedrockAuth;

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
