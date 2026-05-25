"use client";

import { useState } from "react";
import {
  updateUserIdentity,
  type UserIdentity,
} from "@/lib/user-identity";
import type { EditorSettings } from "@/lib/editor-settings";
import { SettingsDialog } from "./settings-dialog";

interface Props {
  title: string;
  onTitleChange: (title: string) => void;
  diagramId: string;
  user: UserIdentity;
  onUserChange: (user: UserIdentity) => void;
  editorSettings: EditorSettings;
  onEditorSettingsChange: (updates: Partial<EditorSettings>) => void;
}

export function Toolbar({
  title,
  onTitleChange,
  diagramId,
  user,
  onUserChange,
  editorSettings,
  onEditorSettingsChange,
}: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = `${window.location.origin}/d/${diagramId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleProfileChange(name: string, color: string) {
    const updated = updateUserIdentity({ name, color });
    onUserChange(updated);
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <span className="hidden text-lg font-bold md:inline">Super Mermaid</span>
        <span className="hidden text-gray-300 md:inline dark:text-gray-700">|</span>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 border-none bg-transparent text-sm font-medium outline-none focus:ring-0"
          placeholder="Untitled Diagram"
        />
        <button
          onClick={handleShare}
          className="rounded px-3 py-1 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {copied ? "Copied!" : "Share"}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="flex max-w-[8rem] items-center gap-2 rounded px-3 py-1 text-sm transition-colors hover:bg-gray-100 md:max-w-none dark:hover:bg-gray-800"
        >
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: user.color }}
          />
          <span className="truncate">{user.name}</span>
        </button>
      </div>

      {showSettings && (
        <SettingsDialog
          name={user.name}
          color={user.color}
          editorSettings={editorSettings}
          onProfileChange={handleProfileChange}
          onEditorSettingsChange={onEditorSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
