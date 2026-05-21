"use client";

import type { PresenceState } from "@/lib/types";

interface Props {
  users: PresenceState[];
  currentUserId: string;
}

export function PresenceBar({ users, currentUserId }: Props) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 px-4 py-1 dark:border-gray-800">
      <span className="mr-2 text-xs text-gray-500">Online:</span>
      {users.map((user) => (
        <div
          key={user.userId}
          className="group relative flex items-center"
          title={user.name}
        >
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: user.color }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          {user.userId === currentUserId && (
            <span className="ml-0.5 text-[10px] text-gray-400">(you)</span>
          )}
        </div>
      ))}
    </div>
  );
}
