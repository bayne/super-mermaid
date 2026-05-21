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

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Expose channel before subscribe so consumers can register presence callbacks
    setChannel(ch);

    return () => {
      supabase.removeChannel(ch);
    };
  }, [diagramId]);

  return channel;
}
