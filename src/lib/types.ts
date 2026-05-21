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
