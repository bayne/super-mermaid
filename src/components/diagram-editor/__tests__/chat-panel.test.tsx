import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/claude-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/claude-auth")>();
  return {
    ...actual,
    getClaudeAuth: vi.fn(() => null),
    setClaudeAuth: vi.fn(),
    clearClaudeAuth: vi.fn(),
    setSelectedModel: vi.fn(),
  };
});

vi.mock("@/lib/claude-oauth", () => ({
  createAuthorization: vi.fn(async () => ({
    verifier: "test-verifier",
    url: "https://claude.ai/oauth/authorize?x=1",
  })),
  exchangeCode: vi.fn(async () => ({
    provider: "subscription",
    expiresAt: 1234567890,
  })),
  clearSubscriptionSession: vi.fn(),
}));

import { ChatPanel } from "../chat-panel";
import { setClaudeAuth, clearClaudeAuth, setSelectedModel } from "@/lib/claude-auth";
import {
  createAuthorization,
  exchangeCode,
  clearSubscriptionSession,
} from "@/lib/claude-oauth";

const anthropicAuth = {
  provider: "anthropic" as const,
  apiKey: "sk-ant-test",
};

const bedrockAuth = {
  provider: "bedrock" as const,
  accessKeyId: "AKIA",
  secretAccessKey: "secret",
  region: "us-east-1",
};

const subscriptionAuth = {
  provider: "subscription" as const,
  expiresAt: 1,
};

describe("ChatPanel", () => {
  const defaultProps = {
    messages: [],
    streamingContent: null,
    onSend: vi.fn(),
    authConfig: null,
    onAuthChange: vi.fn(),
    model: "sonnet-4-6",
    onModelChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText("Shared Claude Chat")).toBeInTheDocument();
  });

  it("shows connect button when not connected", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("shows disconnect button when connected", () => {
    render(<ChatPanel {...defaultProps} authConfig={anthropicAuth} />);
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("shows provider label when connected via Anthropic", () => {
    render(<ChatPanel {...defaultProps} authConfig={anthropicAuth} />);
    expect(screen.getByText("via Anthropic")).toBeInTheDocument();
  });

  it("shows provider label when connected via Bedrock", () => {
    render(<ChatPanel {...defaultProps} authConfig={bedrockAuth} />);
    expect(screen.getByText("via AWS Bedrock")).toBeInTheDocument();
  });

  it("shows provider label when connected via subscription", () => {
    render(<ChatPanel {...defaultProps} authConfig={subscriptionAuth} />);
    expect(screen.getByText("via Claude subscription")).toBeInTheDocument();
  });

  it("shows placeholder for unauthenticated users", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(
      screen.getByText("Connect to Claude to chat, or follow along")
    ).toBeInTheDocument();
  });

  it("shows placeholder for authenticated users with no messages", () => {
    render(<ChatPanel {...defaultProps} authConfig={anthropicAuth} />);
    expect(
      screen.getByText("Ask Claude about your diagram")
    ).toBeInTheDocument();
  });

  it("renders the model selector and changes the model", () => {
    render(<ChatPanel {...defaultProps} />);
    const select = screen.getByLabelText("Model");
    fireEvent.change(select, { target: { value: "opus-4-6" } });
    expect(setSelectedModel).toHaveBeenCalledWith("opus-4-6");
    expect(defaultProps.onModelChange).toHaveBeenCalledWith("opus-4-6");
  });

  it("renders user messages", () => {
    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        messages={[
          {
            id: "1",
            role: "user",
            content: "Hello Claude",
            userName: "Alice",
            userColor: "#E63946",
          },
        ]}
      />
    );
    expect(screen.getByText("Hello Claude")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders assistant messages", () => {
    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        messages={[
          {
            id: "1",
            role: "assistant",
            content: "Here is your diagram fix",
            userName: null,
            userColor: null,
          },
        ]}
      />
    );
    expect(screen.getByText("Here is your diagram fix")).toBeInTheDocument();
    expect(screen.getByText("Claude")).toBeInTheDocument();
  });

  it("renders assistant messages as markdown", () => {
    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        messages={[
          {
            id: "1",
            role: "assistant",
            content: "Use **bold** and `code` here",
            userName: null,
            userColor: null,
          },
        ]}
      />
    );
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("code").tagName).toBe("CODE");
  });

  it("disables export when there are no messages", () => {
    render(<ChatPanel {...defaultProps} authConfig={anthropicAuth} />);
    expect(screen.getByText("Export")).toBeDisabled();
  });

  it("exports the conversation as a downloadable markdown file", () => {
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        title="My Flow"
        messages={[
          {
            id: "1",
            role: "user",
            content: "Hello",
            userName: "Alice",
            userColor: null,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByText("Export"));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    clickSpy.mockRestore();
  });

  it("shows a generating spinner while streaming, not the partial text", () => {
    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        streamingContent="partial response"
      />
    );
    expect(screen.getByText("Generating response…")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Claude is generating a response")
    ).toBeInTheDocument();
    expect(screen.queryByText("partial response")).not.toBeInTheDocument();
  });

  it("shows the generating spinner when streaming is empty", () => {
    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        streamingContent=""
      />
    );
    expect(screen.getByText("Generating response…")).toBeInTheDocument();
  });

  it("calls onSend when submitting message", () => {
    const onSend = vi.fn();
    render(
      <ChatPanel {...defaultProps} authConfig={anthropicAuth} onSend={onSend} />
    );
    const input = screen.getByPlaceholderText("Ask about your diagram...");
    fireEvent.change(input, { target: { value: "test message" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSend).toHaveBeenCalledWith("test message");
  });

  it("disables input when streaming", () => {
    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        streamingContent=""
      />
    );
    const input = screen.getByPlaceholderText("Claude is responding...");
    expect(input).toBeDisabled();
  });

  it("shows auth form with provider tabs when connect is clicked", () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("AWS Bedrock")).toBeInTheDocument();
    expect(screen.getByText("Claude subscription")).toBeInTheDocument();
  });

  it("saves Anthropic API key", () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    const keyInput = screen.getByPlaceholderText("sk-ant-...");
    fireEvent.change(keyInput, { target: { value: "sk-ant-test123" } });
    fireEvent.click(screen.getAllByText("Connect").pop()!);
    expect(setClaudeAuth).toHaveBeenCalledWith({
      provider: "anthropic",
      apiKey: "sk-ant-test123",
    });
    expect(defaultProps.onAuthChange).toHaveBeenCalledWith({
      provider: "anthropic",
      apiKey: "sk-ant-test123",
    });
  });

  it("saves Bedrock credentials", () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    fireEvent.click(screen.getByText("AWS Bedrock"));
    fireEvent.change(screen.getByPlaceholderText("Access Key ID"), {
      target: { value: "AKIA123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Secret Access Key"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Region (us-east-1)"), {
      target: { value: "us-west-2" },
    });
    fireEvent.click(screen.getAllByText("Connect").pop()!);
    expect(setClaudeAuth).toHaveBeenCalledWith({
      provider: "bedrock",
      accessKeyId: "AKIA123",
      secretAccessKey: "secret123",
      region: "us-west-2",
    });
  });

  it("signs in with a Claude subscription", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    fireEvent.click(screen.getByText("Claude subscription"));
    fireEvent.click(screen.getByText("Sign in with Claude"));

    await waitFor(() => expect(createAuthorization).toHaveBeenCalled());
    expect(openSpy).toHaveBeenCalledWith(
      "https://claude.ai/oauth/authorize?x=1",
      "_blank",
      "noopener,noreferrer"
    );

    const codeInput = await screen.findByPlaceholderText(
      "Paste authorization code"
    );
    fireEvent.change(codeInput, { target: { value: "the-code#state" } });
    fireEvent.click(screen.getAllByText("Connect").pop()!);

    await waitFor(() =>
      expect(exchangeCode).toHaveBeenCalledWith("the-code#state", "test-verifier")
    );
    await waitFor(() =>
      expect(setClaudeAuth).toHaveBeenCalledWith({
        provider: "subscription",
        expiresAt: 1234567890,
      })
    );
    openSpy.mockRestore();
  });

  it("surfaces subscription sign-in errors", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.mocked(exchangeCode).mockRejectedValueOnce(new Error("bad code"));
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    fireEvent.click(screen.getByText("Claude subscription"));
    fireEvent.click(screen.getByText("Sign in with Claude"));

    const codeInput = await screen.findByPlaceholderText(
      "Paste authorization code"
    );
    fireEvent.change(codeInput, { target: { value: "bad" } });
    fireEvent.click(screen.getAllByText("Connect").pop()!);

    expect(await screen.findByText("bad code")).toBeInTheDocument();
    expect(setClaudeAuth).not.toHaveBeenCalled();
  });

  it("clears auth on disconnect", () => {
    render(<ChatPanel {...defaultProps} authConfig={anthropicAuth} />);
    fireEvent.click(screen.getByText("Disconnect"));
    expect(clearClaudeAuth).toHaveBeenCalled();
    expect(clearSubscriptionSession).not.toHaveBeenCalled();
    expect(defaultProps.onAuthChange).toHaveBeenCalledWith(null);
  });

  it("clears the server session when disconnecting a subscription", () => {
    render(<ChatPanel {...defaultProps} authConfig={subscriptionAuth} />);
    fireEvent.click(screen.getByText("Disconnect"));
    expect(clearSubscriptionSession).toHaveBeenCalled();
    expect(clearClaudeAuth).toHaveBeenCalled();
  });

  it("renders user message without color", () => {
    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        messages={[
          {
            id: "1",
            role: "user",
            content: "No color",
            userName: "Bob",
            userColor: null,
          },
        ]}
      />
    );
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders Anonymous for user message without name", () => {
    render(
      <ChatPanel
        {...defaultProps}
        authConfig={anthropicAuth}
        messages={[
          {
            id: "1",
            role: "user",
            content: "No name",
            userName: null,
            userColor: null,
          },
        ]}
      />
    );
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("does not send empty messages", () => {
    const onSend = vi.fn();
    render(
      <ChatPanel {...defaultProps} authConfig={anthropicAuth} onSend={onSend} />
    );
    const input = screen.getByPlaceholderText("Ask about your diagram...");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("cancels auth form", () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    expect(screen.getByPlaceholderText("sk-ant-...")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByPlaceholderText("sk-ant-...")).not.toBeInTheDocument();
  });

  it("does not save empty Anthropic key", () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    fireEvent.click(screen.getAllByText("Connect").pop()!);
    expect(setClaudeAuth).not.toHaveBeenCalled();
  });

  it("does not save incomplete Bedrock credentials", () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    fireEvent.click(screen.getByText("AWS Bedrock"));
    fireEvent.change(screen.getByPlaceholderText("Access Key ID"), {
      target: { value: "AKIA123" },
    });
    fireEvent.click(screen.getAllByText("Connect").pop()!);
    expect(setClaudeAuth).not.toHaveBeenCalled();
  });

  it("saves Anthropic key on Enter press", () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Connect"));
    const keyInput = screen.getByPlaceholderText("sk-ant-...");
    fireEvent.change(keyInput, { target: { value: "sk-ant-enter" } });
    fireEvent.keyDown(keyInput, { key: "Enter" });
    expect(setClaudeAuth).toHaveBeenCalledWith({
      provider: "anthropic",
      apiKey: "sk-ant-enter",
    });
  });
});
