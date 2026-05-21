"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";
import type {
  ChatMessage,
  ChatStreamChunk,
  ChatStreamEnd,
} from "@/lib/types";
import type { ClaudeAuthConfig } from "@/lib/claude-auth";

export function useChatSync(
  channel: RealtimeChannel | null,
  diagramId: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    async function loadHistory() {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("diagram_id", diagramId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            userName: m.user_name,
            userColor: m.user_color,
          }))
        );
      }
      loadedRef.current = true;
    }
    loadHistory();
  }, [diagramId]);

  useEffect(() => {
    if (!channel) return;

    channel.on(
      "broadcast",
      { event: "chat_message" },
      (payload: { payload: ChatMessage }) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.payload.id)) return prev;
          return [...prev, payload.payload];
        });
      }
    );

    channel.on(
      "broadcast",
      { event: "chat_stream_start" },
      () => {
        setStreamingContent("");
      }
    );

    channel.on(
      "broadcast",
      { event: "chat_stream_chunk" },
      (payload: { payload: ChatStreamChunk }) => {
        setStreamingContent((prev) =>
          prev !== null ? prev + payload.payload.delta : payload.payload.delta
        );
      }
    );

    channel.on(
      "broadcast",
      { event: "chat_stream_end" },
      (payload: { payload: ChatStreamEnd }) => {
        setStreamingContent(null);
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.payload.messageId)) return prev;
          return [
            ...prev,
            {
              id: payload.payload.messageId,
              role: "assistant" as const,
              content: payload.payload.content,
              userName: null,
              userColor: null,
            },
          ];
        });
      }
    );
  }, [channel]);

  const sendMessage = useCallback(
    async (
      content: string,
      diagramContent: string,
      authConfig: ClaudeAuthConfig,
      userName: string,
      userColor: string
    ) => {
      const userMsg: ChatMessage = {
        id: nanoid(12),
        role: "user",
        content,
        userName,
        userColor,
      };

      setMessages((prev) => [...prev, userMsg]);

      channel?.send({
        type: "broadcast",
        event: "chat_message",
        payload: userMsg,
      });

      await supabase.from("chat_messages").insert({
        id: userMsg.id,
        diagram_id: diagramId,
        role: "user",
        content,
        user_name: userName,
        user_color: userColor,
      });

      const allMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      setStreamingContent("");
      channel?.send({
        type: "broadcast",
        event: "chat_stream_start",
        payload: {},
      });

      const assistantId = nanoid(12);
      let fullContent = "";

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-provider": authConfig.provider,
          "x-model": authConfig.model,
        };
        if (authConfig.provider === "anthropic") {
          headers["x-anthropic-key"] = authConfig.apiKey;
        } else {
          headers["x-aws-access-key"] = authConfig.accessKeyId;
          headers["x-aws-secret-key"] = authConfig.secretAccessKey;
          headers["x-aws-region"] = authConfig.region;
          if (authConfig.sessionToken) {
            headers["x-aws-session-token"] = authConfig.sessionToken;
          }
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: allMessages,
            diagramContent,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "API request failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.delta) {
                fullContent += parsed.delta;
                setStreamingContent(fullContent);
                channel?.send({
                  type: "broadcast",
                  event: "chat_stream_chunk",
                  payload: {
                    messageId: assistantId,
                    delta: parsed.delta,
                  } satisfies ChatStreamChunk,
                });
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                throw e;
              }
            }
          }
        }
      } catch (err) {
        fullContent =
          fullContent ||
          `Error: ${err instanceof Error ? err.message : "Failed to get response"}`;
      }

      setStreamingContent(null);

      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: fullContent,
        userName: null,
        userColor: null,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      channel?.send({
        type: "broadcast",
        event: "chat_stream_end",
        payload: {
          messageId: assistantId,
          content: fullContent,
        } satisfies ChatStreamEnd,
      });

      await supabase.from("chat_messages").insert({
        id: assistantId,
        diagram_id: diagramId,
        role: "assistant",
        content: fullContent,
      });
    },
    [channel, diagramId, messages]
  );

  return { messages, streamingContent, sendMessage };
}
