// DB row types are auto-generated in database.types.ts via `bun run gen:types`.
// Types below are for Supabase Realtime broadcast payloads (not DB-backed).

export interface CursorUpdate {
  userId: string;
  position: number;
  selectionHead: number;
  selectionAnchor: number;
  color: string;
  name: string;
}

export interface PresenceState {
  userId: string;
  name: string;
  color: string;
  onlineSince: string;
}

export interface ContentUpdate {
  userId: string;
  content: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  userName: string | null;
  userColor: string | null;
}

export interface ChatStreamChunk {
  messageId: string;
  delta: string;
}

export interface ChatStreamEnd {
  messageId: string;
  content: string;
}
