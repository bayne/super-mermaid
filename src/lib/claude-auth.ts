const STORAGE_KEY = "super-mermaid-claude-auth";

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
