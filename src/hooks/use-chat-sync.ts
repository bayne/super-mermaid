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
import { streamChatMessage, type ToolDefinition } from "@/lib/claude-client";

// Lets the assistant write directly into the shared editor instead of just
// pasting code into the chat for the user to copy.
const EDITOR_TOOL: ToolDefinition = {
  name: "update_editor",
  description:
    "Replace the entire contents of the diagram editor with new Mermaid.js code. The code you provide becomes the live diagram that every collaborator immediately sees. Always pass the complete diagram, never a fragment or a diff.",
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The complete Mermaid.js diagram code to place in the editor.",
      },
    },
    required: ["code"],
  },
};

export function useChatSync(
  channel: RealtimeChannel | null,
  diagramId: string,
  onApplyDiagram?: (code: string) => void
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
      model: string,
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

      const canEdit = Boolean(onApplyDiagram);
      const editClause = canEdit
        ? `You can edit the diagram directly with the \`update_editor\` tool, which replaces the entire contents of the shared editor. Use it whenever the user asks you to create, change, or apply a diagram — don't just paste code into the chat and tell them to copy it. Always pass the complete Mermaid code; it becomes the live diagram everyone sees. After editing, briefly tell the user what you changed.

For everything else — explaining syntax, suggesting improvements, debugging errors — answer in chat. When you're only illustrating an option the user hasn't asked you to apply, a fenced code block in the chat is fine.`
        : `Help users with their diagrams: explain syntax, suggest improvements, debug errors, or generate new diagram code. When suggesting diagram changes, output the full updated mermaid code in a fenced code block so users can copy it.`;

      const systemPrompt = `You are a helpful AI assistant embedded in Super Mermaid, a collaborative Mermaid.js diagram editor. Multiple users are collaborating on the same diagram and can all see this chat.

Here is the current diagram code:

\`\`\`mermaid
${diagramContent}
\`\`\`

${editClause}

Keep responses concise and focused on the diagram work.`;

      try {
        await streamChatMessage({
          auth: authConfig,
          model,
          systemPrompt,
          messages: allMessages,
          tools: canEdit ? [EDITOR_TOOL] : undefined,
          onToolUse: (name, input) => {
            if (name === "update_editor") {
              const code = (input as { code?: string }).code ?? "";
              onApplyDiagram?.(code);
              return "The editor now shows the updated diagram.";
            }
            return `Unknown tool: ${name}`;
          },
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
    [channel, diagramId, messages, onApplyDiagram]
  );

  return { messages, streamingContent, sendMessage };
}
