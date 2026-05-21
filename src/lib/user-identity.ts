import { nanoid } from "nanoid";
import { randomColor } from "./colors";

export interface UserIdentity {
  userId: string;
  name: string;
  color: string;
}

const STORAGE_KEY = "super-mermaid-user";

export function getUserIdentity(): UserIdentity {
  if (typeof window === "undefined") {
    return { userId: "server", name: "Anonymous", color: "#457B9D" };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fall through to create new
    }
  }

  const identity: UserIdentity = {
    userId: nanoid(12),
    name: "Anonymous",
    color: randomColor(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function updateUserIdentity(
  updates: Partial<Omit<UserIdentity, "userId">>
): UserIdentity {
  const current = getUserIdentity();
  const updated = { ...current, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
