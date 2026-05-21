import { nanoid } from "nanoid";
import { randomColor } from "./colors";

export interface UserIdentity {
  userId: string;
  name: string;
  color: string;
}

const STORAGE_KEY = "super-mermaid-user";

let cachedRaw: string | null = null;
let cachedIdentity: UserIdentity | null = null;

export function getUserIdentity(): UserIdentity {
  if (typeof window === "undefined") {
    return { userId: "server", name: "Anonymous", color: "#457B9D" };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    if (stored === cachedRaw && cachedIdentity) return cachedIdentity;
    try {
      cachedRaw = stored;
      cachedIdentity = JSON.parse(stored);
      return cachedIdentity!;
    } catch {
      // fall through to create new
    }
  }

  const identity: UserIdentity = {
    userId: nanoid(12),
    name: "Anonymous",
    color: randomColor(),
  };
  const raw = JSON.stringify(identity);
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedIdentity = identity;
  return identity;
}

export function updateUserIdentity(
  updates: Partial<Omit<UserIdentity, "userId">>
): UserIdentity {
  const current = getUserIdentity();
  const updated = { ...current, ...updates };
  const raw = JSON.stringify(updated);
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedIdentity = updated;
  return updated;
}
