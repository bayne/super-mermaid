export interface Diagram {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

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
