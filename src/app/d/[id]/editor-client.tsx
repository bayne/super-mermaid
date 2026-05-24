"use client";

import { useEffect, useSyncExternalStore, useState, useCallback } from "react";
import {
  getUserIdentity,
  updateUserIdentity,
  type UserIdentity,
} from "@/lib/user-identity";
import {
  getClaudeAuth,
  getSelectedModel,
  type ClaudeAuthConfig,
} from "@/lib/claude-auth";
import { EditorPanel } from "@/components/diagram-editor/editor-panel";
import { PreviewPanel } from "@/components/diagram-editor/preview-panel";
import { ChatPanel } from "@/components/diagram-editor/chat-panel";
import { Toolbar } from "@/components/diagram-editor/toolbar";
import { PresenceBar } from "@/components/diagram-editor/presence-bar";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { useDiagramSync } from "@/hooks/use-diagram-sync";
import { usePresence } from "@/hooks/use-presence";
import { useCursorSync } from "@/hooks/use-cursor-sync";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useMermaidRender } from "@/hooks/use-mermaid-render";
import { useChatSync } from "@/hooks/use-chat-sync";
import type { CursorUpdate } from "@/lib/types";

interface Props {
  diagramId: string;
  defaultContent: string;
}

const identityListeners = new Set<() => void>();

function subscribeIdentity(callback: () => void) {
  identityListeners.add(callback);
  return () => {
    identityListeners.delete(callback);
  };
}

function getServerIdentity(): UserIdentity | null {
  return null;
}

export function EditorClient({ diagramId, defaultContent }: Props) {
  const user = useSyncExternalStore(
    subscribeIdentity,
    getUserIdentity,
    getServerIdentity
  );

  const handleUserChange = useCallback((updated: UserIdentity) => {
    updateUserIdentity({ name: updated.name, color: updated.color });
    for (const listener of identityListeners) listener();
  }, []);

  if (!user) return null;

  return (
    <EditorInner
      diagramId={diagramId}
      defaultContent={defaultContent}
      user={user}
      onUserChange={handleUserChange}
    />
  );
}

function EditorInner({
  diagramId,
  defaultContent,
  user,
  onUserChange,
}: Props & { user: UserIdentity; onUserChange: (u: UserIdentity) => void }) {
  const channel = useRealtimeChannel(diagramId);
  const [subscribed, setSubscribed] = useState(false);
  const [claudeAuth, setClaudeAuth] = useState<ClaudeAuthConfig | null>(() =>
    getClaudeAuth()
  );
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    getSelectedModel()
  );
  const darkMode = useDarkMode();
  const { content, updateContent, title, updateTitle } = useDiagramSync(
    channel,
    diagramId,
    defaultContent
  );
  const { onlineUsers } = usePresence(channel, user, subscribed);
  const { remoteCursors, broadcastCursor } = useCursorSync(channel, user);
  const { svg, error, errorLine } = useMermaidRender(content, darkMode);
  const { messages, streamingContent, sendMessage } = useChatSync(
    channel,
    diagramId,
    updateContent
  );

  useEffect(() => {
    if (!channel) return;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setSubscribed(true);
    });
    return () => {
      setSubscribed(false);
    };
  }, [channel]);

  const handleSendChat = useCallback(
    (message: string) => {
      if (!claudeAuth) return;
      sendMessage(
        message,
        content,
        claudeAuth,
        selectedModel,
        user.name,
        user.color
      );
    },
    [claudeAuth, content, selectedModel, sendMessage, user.name, user.color]
  );

  const remoteCursorArray: CursorUpdate[] = Array.from(remoteCursors.values());

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        title={title}
        onTitleChange={updateTitle}
        diagramId={diagramId}
        user={user}
        onUserChange={onUserChange}
      />
      <PresenceBar users={onlineUsers} currentUserId={user.userId} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:grid md:grid-rows-2">
        <div className="flex min-h-0 min-w-0 flex-[2] flex-col md:flex-row">
          <div className="min-h-0 min-w-0 flex-1 border-b border-gray-200 dark:border-gray-800 md:w-1/2 md:flex-none md:border-b-0 md:border-r">
            <EditorPanel
              content={content}
              onChange={updateContent}
              remoteCursors={remoteCursorArray}
              onCursorChange={broadcastCursor}
              darkMode={darkMode}
              errorLine={errorLine}
            />
          </div>
          <div className="min-h-0 min-w-0 flex-1 md:w-1/2 md:flex-none">
            <PreviewPanel svg={svg} error={error} />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ChatPanel
            messages={messages}
            streamingContent={streamingContent}
            onSend={handleSendChat}
            authConfig={claudeAuth}
            onAuthChange={setClaudeAuth}
            model={selectedModel}
            onModelChange={setSelectedModel}
            title={title}
          />
        </div>
      </div>
    </div>
  );
}
