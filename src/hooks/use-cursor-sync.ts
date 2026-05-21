"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CursorUpdate } from "@/lib/types";
import type { UserIdentity } from "@/lib/user-identity";

export function useCursorSync(
  channel: RealtimeChannel | null,
  user: UserIdentity
) {
  const [remoteCursors, setRemoteCursors] = useState<
    Map<string, CursorUpdate>
  >(() => new Map());
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ head: number; anchor: number } | null>(null);

  useEffect(() => {
    if (!channel) return;

    channel.on(
      "broadcast",
      { event: "cursor_update" },
      (payload: { payload: CursorUpdate }) => {
        const cursor = payload.payload;
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.set(cursor.userId, cursor);
          return next;
        });
      }
    );

    // Clean up cursors when users leave via presence
    channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
      const leftIds = new Set(
        leftPresences.map(
          (p: Record<string, unknown>) => p.userId as string
        )
      );
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        for (const id of leftIds) {
          next.delete(id);
        }
        return next;
      });
    });
  }, [channel]);

  const broadcastCursor = useCallback(
    (selection: { head: number; anchor: number }) => {
      pendingRef.current = selection;

      if (throttleRef.current !== null) return;

      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
        const sel = pendingRef.current;
        if (!sel || !channel) return;

        channel.send({
          type: "broadcast",
          event: "cursor_update",
          payload: {
            userId: user.userId,
            position: sel.head,
            selectionHead: sel.head,
            selectionAnchor: sel.anchor,
            color: user.color,
            name: user.name,
          } satisfies CursorUpdate,
        });
      }, 50);
    },
    [channel, user.userId, user.color, user.name]
  );

  return { remoteCursors, broadcastCursor };
}
