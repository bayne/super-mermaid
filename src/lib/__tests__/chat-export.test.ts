import { describe, it, expect, vi, afterEach } from "vitest";
import {
  conversationToMarkdown,
  downloadConversation,
} from "@/lib/chat-export";
import type { ChatMessage } from "@/lib/types";

const messages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "How do I add a node?",
    userName: "Alice",
    userColor: "#E63946",
  },
  {
    id: "2",
    role: "assistant",
    content: "Add `A[Node]` to your graph.",
    userName: null,
    userColor: null,
  },
  {
    id: "3",
    role: "user",
    content: "thanks",
    userName: null,
    userColor: null,
  },
];

describe("conversationToMarkdown", () => {
  it("includes the title as a heading", () => {
    expect(conversationToMarkdown(messages, "My Diagram")).toContain(
      "# My Diagram"
    );
  });

  it("falls back to a default title when none is given", () => {
    expect(conversationToMarkdown(messages)).toContain(
      "# Super Mermaid conversation"
    );
  });

  it("labels assistant turns as Claude and users by name", () => {
    const md = conversationToMarkdown(messages);
    expect(md).toContain("## Alice");
    expect(md).toContain("## Claude");
    expect(md).toContain("## Anonymous");
    expect(md).toContain("Add `A[Node]` to your graph.");
  });
});

describe("downloadConversation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a blob url and clicks a slugged download link", () => {
    const createObjectURL = vi.fn(() => "blob:xyz");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    let downloadName = "";
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });

    downloadConversation(messages, "My Diagram!!");

    expect(createObjectURL).toHaveBeenCalled();
    expect(downloadName).toBe("my-diagram.md");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:xyz");
    clickSpy.mockRestore();
  });

  it("uses a fallback filename when the title is empty", () => {
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:xyz"),
      revokeObjectURL: vi.fn(),
    });
    let downloadName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        downloadName = this.download;
      }
    );

    downloadConversation(messages, "   ");
    expect(downloadName).toBe("conversation.md");
  });
});
