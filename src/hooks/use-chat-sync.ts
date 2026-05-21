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
import { streamChatMessage } from "@/lib/claude-client";

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

      const systemPrompt = `You are a helpful AI assistant embedded in Super Mermaid, a collaborative Mermaid.js diagram editor. Multiple users are collaborating on the same diagram and can all see this chat.

Here is the current diagram code:

\`\`\`mermaid
${diagramContent}
\`\`\`

Help users with their diagrams: explain syntax, suggest improvements, debug errors, or generate new diagram code. When suggesting diagram changes, output the full updated mermaid code in a fenced code block so users can copy it.

Keep responses concise and focused on the diagram work.`;

      try {
        await streamChatMessage({
          auth: authConfig,
          systemPrompt,
          messages: allMessages,
          onDelta: (delta) => {
            fullContent += delta;
            setStreamingContent(fullContent);
            channel?.send({
              type: "broadcast",
              event: "chat_stream_chunk",
              payload: {
                messageId: assistantId,
                delta,
              } satisfies ChatStreamChunk,
            });
          },
        });
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
