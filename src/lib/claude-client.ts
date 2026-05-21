import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { AnthropicAuth, BedrockAuth, ClaudeAuthConfig } from "./claude-auth";

interface StreamOptions {
  auth: ClaudeAuthConfig;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  onDelta: (text: string) => void;
}

export async function streamChatMessage(options: StreamOptions): Promise<string> {
  if (options.auth.provider === "anthropic") {
    return streamAnthropicMessage(options.auth, options);
  }
  return streamBedrockMessage(options.auth, options);
}

async function streamAnthropicMessage(
  auth: AnthropicAuth,
  { systemPrompt, messages, onDelta }: StreamOptions
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": auth.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: auth.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { error?: { message?: string } }).error?.message ||
      `Anthropic API error (${res.status})`;
    throw new Error(msg);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

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

      try {
        const event = JSON.parse(data);
        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta"
        ) {
          fullContent += event.delta.text;
          onDelta(event.delta.text);
        }
        if (event.type === "error") {
          throw new Error(event.error?.message || "Stream error");
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return fullContent;
}

async function streamBedrockMessage(
  auth: BedrockAuth,
  { systemPrompt, messages, onDelta }: StreamOptions
): Promise<string> {
  const client = new BedrockRuntimeClient({
    region: auth.region,
    credentials: {
      accessKeyId: auth.accessKeyId,
      secretAccessKey: auth.secretAccessKey,
      ...(auth.sessionToken ? { sessionToken: auth.sessionToken } : {}),
    },
  });

  const command = new ConverseStreamCommand({
    modelId: auth.model,
    system: [{ text: systemPrompt }],
    messages: messages.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    })),
    inferenceConfig: {
      maxTokens: 4096,
    },
  });

  const response = await client.send(command);
  let fullContent = "";

  if (response.stream) {
    for await (const event of response.stream) {
      if (event.contentBlockDelta?.delta?.text) {
        fullContent += event.contentBlockDelta.delta.text;
        onDelta(event.contentBlockDelta.delta.text);
      }
    }
  }

  return fullContent;
}
