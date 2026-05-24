"use client";

import { useState, useRef, useEffect } from "react";
import {
  setClaudeAuth,
  clearClaudeAuth,
  setSelectedModel,
  MODELS,
  type ClaudeAuthConfig,
  type Provider,
} from "@/lib/claude-auth";
import {
  createAuthorization,
  exchangeCode,
  clearSubscriptionSession,
} from "@/lib/claude-oauth";
import type { ChatMessage } from "@/lib/types";
import { Markdown } from "./markdown";
import { downloadConversation } from "@/lib/chat-export";

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  bedrock: "AWS Bedrock",
  subscription: "Claude subscription",
};

interface Props {
  messages: ChatMessage[];
  streamingContent: string | null;
  onSend: (message: string) => void;
  authConfig: ClaudeAuthConfig | null;
  onAuthChange: (config: ClaudeAuthConfig | null) => void;
  model: string;
  onModelChange: (modelId: string) => void;
  title?: string;
}

export function ChatPanel({
  messages,
  streamingContent,
  onSend,
  authConfig,
  onAuthChange,
  model,
  onModelChange,
  title,
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
    if (authConfig?.provider === "subscription") clearSubscriptionSession();
    clearClaudeAuth();
    onAuthChange(null);
  }

  function handleAuthSave(config: ClaudeAuthConfig) {
    setClaudeAuth(config);
    onAuthChange(config);
    setShowAuthForm(false);
  }

  function handleModelChange(modelId: string) {
    setSelectedModel(modelId);
    onModelChange(modelId);
  }

  function handleExport() {
    if (messages.length === 0) return;
    downloadConversation(messages, title);
  }

  return (
    <div className="flex h-full flex-col border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-1.5 dark:border-gray-800">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Shared Claude Chat
          {authConfig && (
            <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">
              via {PROVIDER_LABELS[authConfig.provider]}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <select
            aria-label="Model"
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-600 outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={messages.length === 0}
            title="Export conversation as Markdown"
            className="text-xs text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Export
          </button>
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
            <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm text-gray-500 dark:bg-purple-950 dark:text-gray-400">
              <span
                role="status"
                aria-label="Claude is generating a response"
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600 dark:border-purple-800 dark:border-t-purple-400"
              />
              Generating response…
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
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [sessionToken, setSessionToken] = useState("");

  function handleSave() {
    if (provider === "anthropic") {
      if (!apiKey.trim()) return;
      onSave({ provider: "anthropic", apiKey: apiKey.trim() });
    } else if (provider === "bedrock") {
      if (!accessKeyId.trim() || !secretAccessKey.trim()) return;
      onSave({
        provider: "bedrock",
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region: region.trim() || "us-east-1",
        ...(sessionToken.trim() ? { sessionToken: sessionToken.trim() } : {}),
      });
    }
  }

  const inputClass =
    "w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex gap-1">
        {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProvider(p)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              provider === p
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>

      {provider === "anthropic" && (
        <div className="flex flex-col gap-1.5">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className={inputClass}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
      )}

      {provider === "bedrock" && (
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
        </div>
      )}

      {provider === "subscription" ? (
        <SubscriptionLogin onSave={onSave} onCancel={onCancel} />
      ) : (
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
      )}
    </div>
  );
}

function SubscriptionLogin({
  onSave,
  onCancel,
}: {
  onSave: (config: ClaudeAuthConfig) => void;
  onCancel: () => void;
}) {
  const [verifier, setVerifier] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startLogin() {
    setError(null);
    const { url, verifier } = await createAuthorization();
    setVerifier(verifier);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function completeLogin() {
    if (!verifier || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onSave(await exchangeCode(code, verifier));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

  return (
    <div className="flex flex-col gap-1.5">
      {verifier === null ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Sign in with your Claude Pro or Max subscription to chat without an API
          key.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Authorize in the new tab, then paste the code shown back here.
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste authorization code"
            className={inputClass}
            onKeyDown={(e) => e.key === "Enter" && completeLogin()}
          />
        </>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          Cancel
        </button>
        {verifier === null ? (
          <button
            type="button"
            onClick={startLogin}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
          >
            Sign in with Claude
          </button>
        ) : (
          <button
            type="button"
            onClick={completeLogin}
            disabled={busy || !code.trim()}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Connecting..." : "Connect"}
          </button>
        )}
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
        <div className="rounded-lg bg-purple-50 px-3 py-2 dark:bg-purple-950">
          <Markdown content={message.content} />
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
