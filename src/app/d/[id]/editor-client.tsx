"use client";

import { useEffect, useSyncExternalStore, useState, useCallback } from "react";
import { getUserIdentity, type UserIdentity } from "@/lib/user-identity";
import { getClaudeAuth, type ClaudeAuthConfig } from "@/lib/claude-auth";
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

const subscribe = () => () => {};
const serverSnapshot = (): UserIdentity | null => null;

export function EditorClient({ diagramId, defaultContent }: Props) {
  const initialUser = useSyncExternalStore(
    subscribe,
    getUserIdentity,
    serverSnapshot
  );
  const [user, setUser] = useState<UserIdentity | null>(initialUser);

  if (!user) return null;

  return (
    <EditorInner
      diagramId={diagramId}
      defaultContent={defaultContent}
      user={user}
      onUserChange={setUser}
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
    diagramId
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
      sendMessage(message, content, claudeAuth, user.name, user.color);
    },
    [claudeAuth, content, sendMessage, user.name, user.color]
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
      <div className="grid min-h-0 flex-1 grid-rows-2">
        <div className="flex min-h-0">
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-800">
            <EditorPanel
              content={content}
              onChange={updateContent}
              remoteCursors={remoteCursorArray}
              onCursorChange={broadcastCursor}
              darkMode={darkMode}
              errorLine={errorLine}
            />
          </div>
          <div className="w-1/2">
            <PreviewPanel svg={svg} error={error} />
          </div>
        </div>
        <div className="min-h-0">
          <ChatPanel
            messages={messages}
            streamingContent={streamingContent}
            onSend={handleSendChat}
            authConfig={claudeAuth}
            onAuthChange={setClaudeAuth}
          />
        </div>
      </div>
    </div>
  );
}
