"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeChannel(
  diagramId: string
): RealtimeChannel | null {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const ch = supabase.channel(`diagram:${diagramId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setChannel(ch);
      }
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [diagramId]);

  return channel;
}
