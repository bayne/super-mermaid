import type { ClaudeAuthConfig } from "./claude-auth";

// Safety bound on the number of tool round trips per send so a misbehaving
// model can't loop forever.
const MAX_TOOL_ITERATIONS = 8;

/** A tool the model may call, in Anthropic Messages API format. */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface ToolUse {
  id: string;
  name: string;
  input: unknown;
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

/** A message in the conversation; content is plain text or structured blocks. */
export interface ApiMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface StreamOptions {
  auth: ClaudeAuthConfig;
  /** Logical model id (see MODELS in claude-auth); resolved per provider. */
  model: string;
  systemPrompt: string;
  messages: ApiMessage[];
  onDelta: (text: string) => void;
  /** Tools to expose to the model. Omit to disable tool use. */
  tools?: ToolDefinition[];
  /**
   * Runs a tool the model called and returns the result text fed back to it.
   * Required for tools to actually do anything; without it a call is reported
   * back as unavailable.
   */
  onToolUse?: (name: string, input: unknown) => Promise<string> | string;
}

interface TurnResult {
  text: string;
  toolUses: ToolUse[];
  stopReason: string | null;
}

/**
 * Sends a chat turn and runs the model's tool calls in a loop until it stops
 * asking for tools (or hits MAX_TOOL_ITERATIONS), returning the full assistant
 * text. Text from every turn is forwarded through onDelta as it streams.
 */
export async function streamChatMessage(options: StreamOptions): Promise<string> {
  const messages: ApiMessage[] = [...options.messages];
  let combinedText = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    if (i > 0) {
      // Separate this turn's text from the previous turn's in the stream.
      options.onDelta("\n\n");
      combinedText += "\n\n";
    }

    const turn = await runTurn(options, messages);
    combinedText += turn.text;

    if (turn.stopReason !== "tool_use" || turn.toolUses.length === 0) break;

    // Record the assistant's turn (any text plus the tool calls it made)...
    const assistantContent: ContentBlock[] = [];
    if (turn.text) assistantContent.push({ type: "text", text: turn.text });
    for (const tu of turn.toolUses) {
      assistantContent.push({
        type: "tool_use",
        id: tu.id,
        name: tu.name,
        input: tu.input,
      });
    }
    messages.push({ role: "assistant", content: assistantContent });

    // ...then run each tool and hand the results back for the next turn.
    const results: ContentBlock[] = [];
    for (const tu of turn.toolUses) {
      let content: string;
      try {
        content = options.onToolUse
          ? await options.onToolUse(tu.name, tu.input)
          : `Tool "${tu.name}" is not available.`;
      } catch (e) {
        content = `Error: ${e instanceof Error ? e.message : "tool failed"}`;
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content });
    }
    messages.push({ role: "user", content: results });
  }

  return combinedText;
}

// Chat goes through our own same-origin proxy (/api/claude/messages). The
// subscription OAuth token stays server-side in an httpOnly cookie (sent
// automatically with this request); the server attaches the bearer, applies the
// CLI system prefix, refreshes when needed, and streams the SSE back. The
// browser never holds a secret.
function runTurn(
  options: StreamOptions,
  messages: ApiMessage[]
): Promise<TurnResult> {
  return runProxyTurn({ ...options, messages });
}

async function runProxyTurn({
  model,
  systemPrompt,
  messages,
  onDelta,
  tools,
}: StreamOptions): Promise<TurnResult> {
  const res = await fetch("/api/claude/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages,
      ...(tools?.length ? { tools } : {}),
    }),
  });

  return consumeSseStream(res, onDelta);
}

/**
 * Accumulates a single streamed turn from Anthropic-format SSE events: forwards
 * text deltas, collects tool_use blocks, and tracks the stop reason.
 */
function createTurnAccumulator(onDelta: (text: string) => void) {
  const blocks = new Map<
    number,
    { type?: string; id?: string; name?: string; json: string }
  >();
  let text = "";
  let stopReason: string | null = null;

  function handle(event: {
    type?: string;
    index?: number;
    delta?: {
      type?: string;
      text?: string;
      partial_json?: string;
      stop_reason?: string;
    };
    content_block?: { type?: string; id?: string; name?: string };
    error?: { message?: string };
  }): void {
    switch (event.type) {
      case "content_block_start":
        blocks.set(event.index!, {
          type: event.content_block?.type,
          id: event.content_block?.id,
          name: event.content_block?.name,
          json: "",
        });
        break;
      case "content_block_delta":
        if (event.delta?.type === "text_delta") {
          text += event.delta.text;
          onDelta(event.delta.text!);
        } else if (event.delta?.type === "input_json_delta") {
          const block = blocks.get(event.index!);
          if (block) block.json += event.delta.partial_json ?? "";
        }
        break;
      case "message_delta":
        if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
        break;
      case "error":
        throw new Error(event.error?.message || "Stream error");
    }
  }

  function result(): TurnResult {
    const toolUses: ToolUse[] = [];
    for (const block of blocks.values()) {
      if (block.type === "tool_use" && block.id && block.name) {
        toolUses.push({
          id: block.id,
          name: block.name,
          input: block.json ? JSON.parse(block.json) : {},
        });
      }
    }
    return { text, toolUses, stopReason };
  }

  return { handle, result };
}

/** Reads an Anthropic SSE stream, forwarding text and collecting tool calls. */
async function consumeSseStream(
  res: Response,
  onDelta: (text: string) => void
): Promise<TurnResult> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { error?: { message?: string } }).error?.message ||
      `Anthropic API error (${res.status})`;
    throw new Error(msg);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const acc = createTurnAccumulator(onDelta);
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;

      let event: unknown;
      try {
        event = JSON.parse(data);
      } catch {
        continue;
      }
      acc.handle(event as Parameters<typeof acc.handle>[0]);
    }
  }

  return acc.result();
}

