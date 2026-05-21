import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock("nanoid", () => {
  let counter = 0;
  return {
    nanoid: vi.fn(() => `mock-id-${++counter}`),
  };
});

import { useChatSync } from "../use-chat-sync";
import { supabase } from "@/lib/supabase";

function createMockChannel() {
  const listeners: Record<string, (payload: unknown) => void> = {};
  return {
    on: vi.fn(
      (
        _type: string,
        filter: { event: string },
        cb: (payload: unknown) => void
      ) => {
        listeners[filter.event] = cb;
        return { on: vi.fn().mockReturnThis() };
      }
    ),
    send: vi.fn(),
    _trigger: (event: string, payload: unknown) => {
      listeners[event]?.(payload);
    },
  };
}

function mockHistoryData(data: unknown[]) {
  const mockOrder = vi.fn().mockResolvedValue({ data });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(supabase.from).mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  } as never);
  return { mockInsert };
}

describe("useChatSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryData([]);
  });

  it("starts with empty messages", () => {
    const { result } = renderHook(() => useChatSync(null, "test-diagram"));
    expect(result.current.messages).toEqual([]);
    expect(result.current.streamingContent).toBeNull();
  });

  it("loads history from Supabase on mount", async () => {
    mockHistoryData([
      {
        id: "hist-1",
        role: "user",
        content: "Hi",
        user_name: "Alice",
        user_color: "#E63946",
      },
      {
        id: "hist-2",
        role: "assistant",
        content: "Hello!",
        user_name: null,
        user_color: null,
      },
    ]);

    const { result } = renderHook(() => useChatSync(null, "test-diagram"));

    await vi.waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[0]).toEqual({
      id: "hist-1",
      role: "user",
      content: "Hi",
      userName: "Alice",
      userColor: "#E63946",
    });
    expect(result.current.messages[1].role).toBe("assistant");
  });

  it("adds messages from broadcast", () => {
    const channel = createMockChannel();

    const { result } = renderHook(() =>
      useChatSync(channel as never, "test-diagram")
    );

    act(() => {
      channel._trigger("chat_message", {
        payload: {
          id: "msg-1",
          role: "user",
          content: "Hello",
          userName: "Alice",
          userColor: "#E63946",
        },
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Hello");
  });

  it("deduplicates messages by id", () => {
    const channel = createMockChannel();

    const { result } = renderHook(() =>
      useChatSync(channel as never, "test-diagram")
    );

    const payload = {
      payload: {
        id: "msg-1",
        role: "user",
        content: "Hello",
        userName: "Alice",
        userColor: "#E63946",
      },
    };

    act(() => {
      channel._trigger("chat_message", payload);
    });
    act(() => {
      channel._trigger("chat_message", payload);
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it("handles streaming start", () => {
    const channel = createMockChannel();

    const { result } = renderHook(() =>
      useChatSync(channel as never, "test-diagram")
    );

    act(() => {
      channel._trigger("chat_stream_start", { payload: {} });
    });

    expect(result.current.streamingContent).toBe("");
  });

  it("accumulates streaming chunks", () => {
    const channel = createMockChannel();

    const { result } = renderHook(() =>
      useChatSync(channel as never, "test-diagram")
    );

    act(() => {
      channel._trigger("chat_stream_start", { payload: {} });
    });

    act(() => {
      channel._trigger("chat_stream_chunk", {
        payload: { messageId: "a", delta: "Hello " },
      });
    });

    act(() => {
      channel._trigger("chat_stream_chunk", {
        payload: { messageId: "a", delta: "world" },
      });
    });

    expect(result.current.streamingContent).toBe("Hello world");
  });

  it("handles chunk when streaming not started", () => {
    const channel = createMockChannel();

    const { result } = renderHook(() =>
      useChatSync(channel as never, "test-diagram")
    );

    act(() => {
      channel._trigger("chat_stream_chunk", {
        payload: { messageId: "a", delta: "Hello" },
      });
    });

    expect(result.current.streamingContent).toBe("Hello");
  });

  it("handles stream end", () => {
    const channel = createMockChannel();

    const { result } = renderHook(() =>
      useChatSync(channel as never, "test-diagram")
    );

    act(() => {
      channel._trigger("chat_stream_start", { payload: {} });
    });

    act(() => {
      channel._trigger("chat_stream_end", {
        payload: { messageId: "a-1", content: "Full response" },
      });
    });

    expect(result.current.streamingContent).toBeNull();
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Full response");
    expect(result.current.messages[0].role).toBe("assistant");
  });

  it("deduplicates stream end message", () => {
    const channel = createMockChannel();

    const { result } = renderHook(() =>
      useChatSync(channel as never, "test-diagram")
    );

    act(() => {
      channel._trigger("chat_stream_end", {
        payload: { messageId: "a-1", content: "Response" },
      });
    });
    act(() => {
      channel._trigger("chat_stream_end", {
        payload: { messageId: "a-1", content: "Response" },
      });
    });

    expect(result.current.messages).toHaveLength(1);
  });

  describe("sendMessage", () => {
    it("adds user message and broadcasts it", async () => {
      const channel = createMockChannel();
      const { mockInsert } = mockHistoryData([]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"delta":"Hi"}\n\ndata: [DONE]\n\n'
                ),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

      const { result } = renderHook(() =>
        useChatSync(channel as never, "test-diagram")
      );

      await act(async () => {
        await result.current.sendMessage(
          "Hello",
          "graph TD",
          { provider: "anthropic" as const, apiKey: "sk-ant-test", model: "claude-sonnet-4-6" },
          "Alice",
          "#E63946"
        );
      });

      expect(channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "broadcast",
          event: "chat_message",
        })
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          diagram_id: "test-diagram",
          role: "user",
          content: "Hello",
          user_name: "Alice",
        })
      );
    });

    it("handles API error", async () => {
      const channel = createMockChannel();
      mockHistoryData([]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Invalid key" }),
      });

      const { result } = renderHook(() =>
        useChatSync(channel as never, "test-diagram")
      );

      await act(async () => {
        await result.current.sendMessage(
          "Hello",
          "graph TD",
          { provider: "anthropic" as const, apiKey: "bad-key", model: "claude-sonnet-4-6" },
          "Alice",
          "#E63946"
        );
      });

      const errorMsg = result.current.messages.find(
        (m) => m.role === "assistant"
      );
      expect(errorMsg?.content).toContain("Invalid key");
    });

    it("sends stream end after completion", async () => {
      const channel = createMockChannel();
      mockHistoryData([]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"delta":"Response"}\n\ndata: [DONE]\n\n'
                ),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

      const { result } = renderHook(() =>
        useChatSync(channel as never, "test-diagram")
      );

      await act(async () => {
        await result.current.sendMessage(
          "Q",
          "graph TD",
          { provider: "anthropic" as const, apiKey: "sk-ant-test", model: "claude-sonnet-4-6" },
          "Alice",
          "#E63946"
        );
      });

      expect(channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "broadcast",
          event: "chat_stream_end",
        })
      );

      expect(result.current.streamingContent).toBeNull();
    });

    it("handles fetch failure", async () => {
      const channel = createMockChannel();
      mockHistoryData([]);

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useChatSync(channel as never, "test-diagram")
      );

      await act(async () => {
        await result.current.sendMessage(
          "Hello",
          "graph TD",
          { provider: "anthropic" as const, apiKey: "sk-ant-test", model: "claude-sonnet-4-6" },
          "Alice",
          "#E63946"
        );
      });

      const errorMsg = result.current.messages.find(
        (m) => m.role === "assistant"
      );
      expect(errorMsg?.content).toContain("Network error");
    });

    it("handles stream error in SSE data", async () => {
      const channel = createMockChannel();
      mockHistoryData([]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"error":"Rate limited"}\n\n'
                ),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

      const { result } = renderHook(() =>
        useChatSync(channel as never, "test-diagram")
      );

      await act(async () => {
        await result.current.sendMessage(
          "Hello",
          "graph TD",
          { provider: "anthropic" as const, apiKey: "sk-ant-test", model: "claude-sonnet-4-6" },
          "Alice",
          "#E63946"
        );
      });

      const errorMsg = result.current.messages.find(
        (m) => m.role === "assistant"
      );
      expect(errorMsg?.content).toContain("Rate limited");
    });

    it("sends Bedrock credentials in headers", async () => {
      const channel = createMockChannel();
      mockHistoryData([]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"delta":"OK"}\n\ndata: [DONE]\n\n'
                ),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

      const { result } = renderHook(() =>
        useChatSync(channel as never, "test-diagram")
      );

      await act(async () => {
        await result.current.sendMessage(
          "Hello",
          "graph TD",
          {
            provider: "bedrock" as const,
            accessKeyId: "AKIA123",
            secretAccessKey: "secret",
            region: "us-west-2",
            sessionToken: "token",
            model: "us.anthropic.claude-sonnet-4-6-v1:0",
          },
          "Alice",
          "#E63946"
        );
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-provider": "bedrock",
            "x-model": "us.anthropic.claude-sonnet-4-6-v1:0",
            "x-aws-access-key": "AKIA123",
            "x-aws-secret-key": "secret",
            "x-aws-region": "us-west-2",
            "x-aws-session-token": "token",
          }),
        })
      );
    });

    it("sends Bedrock credentials without session token", async () => {
      const channel = createMockChannel();
      mockHistoryData([]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"delta":"OK"}\n\ndata: [DONE]\n\n'
                ),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      });

      const { result } = renderHook(() =>
        useChatSync(channel as never, "test-diagram")
      );

      await act(async () => {
        await result.current.sendMessage(
          "Hello",
          "graph TD",
          {
            provider: "bedrock" as const,
            accessKeyId: "AKIA123",
            secretAccessKey: "secret",
            region: "us-east-1",
            model: "us.anthropic.claude-sonnet-4-6-v1:0",
          },
          "Alice",
          "#E63946"
        );
      });

      const callHeaders = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][1].headers;
      expect(callHeaders["x-provider"]).toBe("bedrock");
      expect(callHeaders["x-aws-session-token"]).toBeUndefined();
    });
  });
});
