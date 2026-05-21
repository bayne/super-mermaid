"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { ContentUpdate } from "@/lib/types";

export function useDiagramSync(
  channel: RealtimeChannel | null,
  diagramId: string,
  defaultContent: string
) {
  const [content, setContent] = useState<string>(defaultContent);
  const [title, setTitle] = useState<string>("Untitled Diagram");
  const lastRemoteUpdateRef = useRef<number>(0);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // Load from DB on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .rpc("get_diagram", { p_id: diagramId })
        .single();

      if (data) {
        setContent(data.content);
        setTitle(data.title);
      } else {
        // Create new diagram
        await supabase.from("diagrams").insert({
          id: diagramId,
          title: "Untitled Diagram",
          content: defaultContent,
        });
      }
      loadedRef.current = true;
    }
    load();
  }, [diagramId, defaultContent]);

  // Listen for remote content updates
  useEffect(() => {
    if (!channel) return;

    channel.on(
      "broadcast",
      { event: "content_update" },
      (payload: { payload: ContentUpdate }) => {
        lastRemoteUpdateRef.current = Date.now();
        setContent(payload.payload.content);
      }
    );
  }, [channel]);

  // Listen for remote title updates
  useEffect(() => {
    if (!channel) return;

    channel.on(
      "broadcast",
      { event: "title_update" },
      (payload: { payload: { title: string } }) => {
        setTitle(payload.payload.title);
      }
    );
  }, [channel]);

  const saveToDb = useCallback(
    (newContent: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!loadedRef.current) return;
        await supabase
          .from("diagrams")
          .update({ content: newContent })
          .eq("id", diagramId);
      }, 2000);
    },
    [diagramId]
  );

  const updateContent = useCallback(
    (newContent: string) => {
      // Suppress broadcast if this was triggered by a remote update
      const isRemoteEcho = Date.now() - lastRemoteUpdateRef.current < 100;
      setContent(newContent);

      if (!isRemoteEcho && channel) {
        if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = setTimeout(() => {
          channel.send({
            type: "broadcast",
            event: "content_update",
            payload: {
              userId: "",
              content: newContent,
              timestamp: Date.now(),
            } satisfies ContentUpdate,
          });
        }, 300);
      }

      saveToDb(newContent);
    },
    [channel, saveToDb]
  );

  const updateTitle = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      channel?.send({
        type: "broadcast",
        event: "title_update",
        payload: { title: newTitle },
      });
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await supabase
          .from("diagrams")
          .update({ title: newTitle })
          .eq("id", diagramId);
      }, 1000);
    },
    [channel, diagramId]
  );

  return { content, updateContent, title, updateTitle };
}
