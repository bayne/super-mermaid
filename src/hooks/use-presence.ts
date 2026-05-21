"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { PresenceState } from "@/lib/types";
import type { UserIdentity } from "@/lib/user-identity";

export function usePresence(
  channel: RealtimeChannel | null,
  user: UserIdentity,
  subscribed: boolean
) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);

  useEffect(() => {
    if (!channel) return;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceState>();
      const users = Object.values(state).flat();
      setOnlineUsers(users);
    });
  }, [channel]);

  useEffect(() => {
    if (!channel || !subscribed) return;

    channel.track({
      userId: user.userId,
      name: user.name,
      color: user.color,
      onlineSince: new Date().toISOString(),
    });

    return () => {
      channel.untrack();
    };
  }, [channel, subscribed, user.userId, user.name, user.color]);

  return { onlineUsers };
}
