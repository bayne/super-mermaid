"use client";

import { useSyncExternalStore, useState } from "react";
import { getUserIdentity, type UserIdentity } from "@/lib/user-identity";
import { EditorPanel } from "@/components/diagram-editor/editor-panel";
import { PreviewPanel } from "@/components/diagram-editor/preview-panel";
import { Toolbar } from "@/components/diagram-editor/toolbar";
import { PresenceBar } from "@/components/diagram-editor/presence-bar";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { useDiagramSync } from "@/hooks/use-diagram-sync";
import { usePresence } from "@/hooks/use-presence";
import { useCursorSync } from "@/hooks/use-cursor-sync";
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
    () => serverSnapshot()
  );
  const [user, setUser] = useState<UserIdentity | null>(initialUser);

  if (!user) return null;

  return <EditorInner diagramId={diagramId} defaultContent={defaultContent} user={user} onUserChange={setUser} />;
}

function EditorInner({
  diagramId,
  defaultContent,
  user,
  onUserChange,
}: Props & { user: UserIdentity; onUserChange: (u: UserIdentity) => void }) {
  const channel = useRealtimeChannel(diagramId);
  const { content, updateContent, title, updateTitle } = useDiagramSync(
    channel,
    diagramId,
    defaultContent
  );
  const { onlineUsers } = usePresence(channel, user);
  const { remoteCursors, broadcastCursor } = useCursorSync(channel, user);

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
      <div className="flex flex-1 min-h-0">
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-800">
          <EditorPanel
            content={content}
            onChange={updateContent}
            remoteCursors={remoteCursorArray}
            onCursorChange={broadcastCursor}
          />
        </div>
        <div className="w-1/2">
          <PreviewPanel content={content} />
        </div>
      </div>
    </div>
  );
}
