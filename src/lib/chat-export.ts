import type { ChatMessage } from "@/lib/types";

// Serializes a conversation to a Markdown transcript suitable for download.
export function conversationToMarkdown(
  messages: ChatMessage[],
  title?: string
): string {
  const heading = `# ${title?.trim() || "Super Mermaid conversation"}\n`;
  const body = messages
    .map((m) => {
      const who =
        m.role === "assistant" ? "Claude" : m.userName?.trim() || "Anonymous";
      return `## ${who}\n\n${m.content}\n`;
    })
    .join("\n");
  return `${heading}\n${body}`;
}

// Triggers a client-side download of the conversation as a Markdown file.
export function downloadConversation(
  messages: ChatMessage[],
  title?: string
): void {
  const markdown = conversationToMarkdown(messages, title);
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const slug = (title?.trim() || "conversation")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug || "conversation"}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
