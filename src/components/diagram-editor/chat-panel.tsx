"use client";

import { useState, useRef, useEffect } from "react";
import {
  setClaudeAuth,
  clearClaudeAuth,
  ANTHROPIC_MODELS,
  BEDROCK_MODELS,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_BEDROCK_MODEL,
  type ClaudeAuthConfig,
} from "@/lib/claude-auth";
import type { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  streamingContent: string | null;
  onSend: (message: string) => void;
  authConfig: ClaudeAuthConfig | null;
  onAuthChange: (config: ClaudeAuthConfig | null) => void;
}

export function ChatPanel({
  messages,
  streamingContent,
  onSend,
  authConfig,
  onAuthChange,
}: Props) {
  const [input, setInput] = useState("");
  const [showAuthForm, setShowAuthForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSending = streamingContent !== null;
  const isConnected = !!authConfig;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isSending || !isConnected) return;
    onSend(input.trim());
    setInput("");
  }

  function handleDisconnect() {
    clearClaudeAuth();
    onAuthChange(null);
  }

  function handleAuthSave(config: ClaudeAuthConfig) {
    setClaudeAuth(config);
    onAuthChange(config);
    setShowAuthForm(false);
  }

  return (
    <div className="flex h-full flex-col border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-1.5 dark:border-gray-800">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Shared Claude Chat
          {authConfig && (
            <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">
              via {authConfig.provider === "bedrock" ? "AWS Bedrock" : "Anthropic"}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="text-xs text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowAuthForm(true)}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {showAuthForm && !isConnected && (
        <AuthForm
          onSave={handleAuthSave}
          onCancel={() => setShowAuthForm(false)}
        />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 && !streamingContent && (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            {isConnected
              ? "Ask Claude about your diagram"
              : "Connect to Claude to chat, or follow along"}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {streamingContent !== null && (
          <div className="mb-3">
            <div className="mb-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
              Claude
            </div>
            <div className="whitespace-pre-wrap rounded-lg bg-purple-50 px-3 py-2 text-sm text-gray-800 dark:bg-purple-950 dark:text-gray-200">
              {streamingContent || (
                <span className="animate-pulse text-gray-400">Thinking...</span>
              )}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-gray-200 px-4 py-2 dark:border-gray-800"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isConnected
              ? isSending
                ? "Claude is responding..."
                : "Ask about your diagram..."
              : "Connect to send messages"
          }
          disabled={!isConnected || isSending}
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
        <button
          type="submit"
          disabled={!isConnected || isSending || !input.trim()}
          className="rounded bg-purple-600 px-4 py-1.5 text-sm text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function AuthForm({
  onSave,
  onCancel,
}: {
  onSave: (config: ClaudeAuthConfig) => void;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState<"anthropic" | "bedrock">("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [sessionToken, setSessionToken] = useState("");
  const [anthropicModel, setAnthropicModel] = useState<string>(DEFAULT_ANTHROPIC_MODEL);
  const [bedrockModel, setBedrockModel] = useState<string>(DEFAULT_BEDROCK_MODEL);

  function handleSave() {
    if (provider === "anthropic") {
      if (!apiKey.trim()) return;
      onSave({ provider: "anthropic", apiKey: apiKey.trim(), model: anthropicModel });
    } else {
      if (!accessKeyId.trim() || !secretAccessKey.trim()) return;
      onSave({
        provider: "bedrock",
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region: region.trim() || "us-east-1",
        model: bedrockModel,
        ...(sessionToken.trim()
          ? { sessionToken: sessionToken.trim() }
          : {}),
      });
    }
  }

  const inputClass =
    "w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";
  const selectClass =
    "w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex gap-1">
        <button
          type="button"
          onClick={() => setProvider("anthropic")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            provider === "anthropic"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Anthropic
        </button>
        <button
          type="button"
          onClick={() => setProvider("bedrock")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            provider === "bedrock"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          AWS Bedrock
        </button>
      </div>

      {provider === "anthropic" ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className={inputClass + " flex-1"}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <select
            value={anthropicModel}
            onChange={(e) => setAnthropicModel(e.target.value)}
            className={selectClass}
          >
            {ANTHROPIC_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="Access Key ID"
              className={inputClass + " flex-1"}
            />
            <input
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="Secret Access Key"
              className={inputClass + " flex-1"}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Region (us-east-1)"
              className={inputClass + " flex-1"}
            />
            <input
              type="text"
              value={sessionToken}
              onChange={(e) => setSessionToken(e.target.value)}
              placeholder="Session Token (optional)"
              className={inputClass + " flex-1"}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <select
            value={bedrockModel}
            onChange={(e) => setBedrockModel(e.target.value)}
            className={selectClass}
          >
            {BEDROCK_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "assistant") {
    return (
      <div className="mb-3">
        <div className="mb-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
          Claude
        </div>
        <div className="whitespace-pre-wrap rounded-lg bg-purple-50 px-3 py-2 text-sm text-gray-800 dark:bg-purple-950 dark:text-gray-200">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        {message.userColor && (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: message.userColor }}
          />
        )}
        {message.userName || "Anonymous"}
      </div>
      <div className="whitespace-pre-wrap rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">
        {message.content}
      </div>
    </div>
  );
}
