import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamChatMessage } from "../claude-client";

const baseOptions = {
  model: "sonnet-4-6",
  systemPrompt: "system",
  messages: [{ role: "user" as const, content: "hi" }],
};

const subAuth = {
  provider: "subscription" as const,
  expiresAt: Date.now() + 600_000,
};

function sseResponse(events: object[], ok = true, status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return { ok, status, body } as unknown as Response;
}

function textDelta(text: string) {
  return { type: "content_block_delta", delta: { type: "text_delta", text } };
}

// Emits the SSE events for a single tool call plus the tool_use stop reason.
function toolUseEvents(id: string, name: string, input: object) {
  return [
    { type: "content_block_start", index: 0, content_block: { type: "tool_use", id, name } },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "input_json_delta", partial_json: JSON.stringify(input) },
    },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "tool_use" } },
  ];
}

const editorTool = {
  name: "update_editor",
  description: "edit the diagram",
  input_schema: { type: "object" },
};

describe("streamChatMessage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  // Chat goes through the same-origin proxy; the OAuth token stays server-side
  // in an httpOnly cookie, so the request body carries no secret — just the
  // model, system prompt, and messages.
  describe("proxying", () => {
    it("posts to the server route with no secret in the request", async () => {
      fetchMock.mockResolvedValue(
        sseResponse([textDelta("Hello "), textDelta("world")])
      );
      const onDelta = vi.fn();

      const result = await streamChatMessage({
        ...baseOptions,
        auth: subAuth,
        onDelta,
      });

      expect(result).toBe("Hello world");
      expect(onDelta).toHaveBeenNthCalledWith(1, "Hello ");
      expect(onDelta).toHaveBeenNthCalledWith(2, "world");

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/claude/messages");
      expect(init.headers["x-api-key"]).toBeUndefined();
      expect(init.headers.Authorization).toBeUndefined();
      const sent = JSON.parse(init.body);
      expect(sent).toEqual({
        model: "sonnet-4-6",
        system: "system",
        messages: baseOptions.messages,
      });
    });

    it("throws the API error message on non-ok responses", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "invalid key" } }),
      } as unknown as Response);

      await expect(
        streamChatMessage({
          ...baseOptions,
          auth: subAuth,
          onDelta: vi.fn(),
        })
      ).rejects.toThrow("invalid key");
    });

    it("surfaces a not-signed-in error from the proxy", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Not signed in" } }),
      } as unknown as Response);

      await expect(
        streamChatMessage({
          ...baseOptions,
          auth: { provider: "subscription", expiresAt: 0 },
          onDelta: vi.fn(),
        })
      ).rejects.toThrow("Not signed in");
    });

    it("throws on an error event in the stream", async () => {
      fetchMock.mockResolvedValue(
        sseResponse([{ type: "error", error: { message: "boom" } }])
      );

      await expect(
        streamChatMessage({
          ...baseOptions,
          auth: subAuth,
          onDelta: vi.fn(),
        })
      ).rejects.toThrow("boom");
    });

    it("falls back to a generic message when the error body is empty", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("no body");
        },
      } as unknown as Response);

      await expect(
        streamChatMessage({
          ...baseOptions,
          auth: subAuth,
          onDelta: vi.fn(),
        })
      ).rejects.toThrow("Anthropic API error (500)");
    });
  });

  describe("tool use", () => {
    it("runs a tool call and feeds the result back to the model", async () => {
      fetchMock
        .mockResolvedValueOnce(
          sseResponse(toolUseEvents("tu_1", "update_editor", { code: "graph TD" }))
        )
        .mockResolvedValueOnce(sseResponse([textDelta("Done — updated the editor.")]));

      const onToolUse = vi.fn().mockResolvedValue("applied");
      const onDelta = vi.fn();

      const result = await streamChatMessage({
        ...baseOptions,
        auth: subAuth,
        tools: [editorTool],
        onToolUse,
        onDelta,
      });

      expect(onToolUse).toHaveBeenCalledWith("update_editor", { code: "graph TD" });
      expect(result).toContain("Done — updated the editor.");
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // First request advertises the tools.
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).tools).toEqual([editorTool]);

      // Second request carries the assistant's tool_use and our tool_result.
      const followup = JSON.parse(fetchMock.mock.calls[1][1].body);
      const assistantMsg = followup.messages.at(-2);
      const resultMsg = followup.messages.at(-1);
      expect(assistantMsg.role).toBe("assistant");
      expect(assistantMsg.content).toContainEqual(
        expect.objectContaining({ type: "tool_use", id: "tu_1", name: "update_editor" })
      );
      expect(resultMsg.role).toBe("user");
      expect(resultMsg.content[0]).toEqual({
        type: "tool_result",
        tool_use_id: "tu_1",
        content: "applied",
      });
    });

    it("reports a tool as unavailable when no onToolUse handler is given", async () => {
      fetchMock
        .mockResolvedValueOnce(
          sseResponse(toolUseEvents("tu_1", "update_editor", { code: "graph TD" }))
        )
        .mockResolvedValueOnce(sseResponse([textDelta("ok")]));

      await streamChatMessage({
        ...baseOptions,
        auth: subAuth,
        tools: [editorTool],
        onDelta: vi.fn(),
      });

      const followup = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(followup.messages.at(-1).content[0].content).toContain("not available");
    });

    it("returns the tool error to the model when the handler throws", async () => {
      fetchMock
        .mockResolvedValueOnce(
          sseResponse(toolUseEvents("tu_1", "update_editor", { code: "graph TD" }))
        )
        .mockResolvedValueOnce(sseResponse([textDelta("ok")]));

      await streamChatMessage({
        ...baseOptions,
        auth: subAuth,
        tools: [editorTool],
        onToolUse: () => {
          throw new Error("editor offline");
        },
        onDelta: vi.fn(),
      });

      const followup = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(followup.messages.at(-1).content[0].content).toContain("editor offline");
    });

    it("omits the tools field when none are provided", async () => {
      fetchMock.mockResolvedValue(sseResponse([textDelta("hi")]));

      await streamChatMessage({
        ...baseOptions,
        auth: subAuth,
        onDelta: vi.fn(),
      });

      expect(JSON.parse(fetchMock.mock.calls[0][1].body).tools).toBeUndefined();
    });

    it("forwards tools through the subscription proxy", async () => {
      fetchMock.mockResolvedValue(sseResponse([textDelta("ok")]));

      await streamChatMessage({
        ...baseOptions,
        auth: { provider: "subscription", expiresAt: Date.now() + 600_000 },
        tools: [editorTool],
        onDelta: vi.fn(),
      });

      expect(JSON.parse(fetchMock.mock.calls[0][1].body).tools).toEqual([editorTool]);
    });

    it("ignores malformed SSE data lines", async () => {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("data: not-json\n\n"));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(textDelta("real"))}\n\n`)
          );
          controller.close();
        },
      });
      fetchMock.mockResolvedValue({ ok: true, status: 200, body } as unknown as Response);

      const result = await streamChatMessage({
        ...baseOptions,
        auth: subAuth,
        onDelta: vi.fn(),
      });

      expect(result).toBe("real");
    });
  });
});
