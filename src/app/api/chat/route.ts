import Anthropic from "@anthropic-ai/sdk";
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";

export const dynamic = "force-dynamic";

interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  diagramContent: string;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const BEDROCK_MODEL = "us.anthropic.claude-sonnet-4-6-v1:0";

function createClient(
  request: Request
): { client: Anthropic | AnthropicBedrock; model: string } | null {
  const provider = request.headers.get("x-provider") || "anthropic";

  if (provider === "bedrock") {
    const accessKey = request.headers.get("x-aws-access-key");
    const secretKey = request.headers.get("x-aws-secret-key");
    const region = request.headers.get("x-aws-region") || "us-east-1";
    const sessionToken = request.headers.get("x-aws-session-token");

    if (!accessKey || !secretKey) return null;

    return {
      client: new AnthropicBedrock({
        awsAccessKey: accessKey,
        awsSecretKey: secretKey,
        awsRegion: region,
        ...(sessionToken ? { awsSessionToken: sessionToken } : {}),
      }),
      model: BEDROCK_MODEL,
    };
  }

  const apiKey = request.headers.get("x-anthropic-key");
  if (!apiKey) return null;

  return {
    client: new Anthropic({ apiKey }),
    model: ANTHROPIC_MODEL,
  };
}

export async function POST(request: Request) {
  const result = createClient(request);
  if (!result) {
    return Response.json({ error: "Missing credentials" }, { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, diagramContent } = body;
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "Messages required" }, { status: 400 });
  }

  const systemPrompt = `You are a helpful AI assistant embedded in Super Mermaid, a collaborative Mermaid.js diagram editor. Multiple users are collaborating on the same diagram and can all see this chat.

Here is the current diagram code:

\`\`\`mermaid
${diagramContent}
\`\`\`

Help users with their diagrams: explain syntax, suggest improvements, debug errors, or generate new diagram code. When suggesting diagram changes, output the full updated mermaid code in a fenced code block so users can copy it.

Keep responses concise and focused on the diagram work.`;

  const stream = await result.client.messages.stream({
    model: result.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = `data: ${JSON.stringify({ delta: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Claude API error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
