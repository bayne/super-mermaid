"use client";

import { useState } from "react";
import { COLORS } from "@/lib/colors";
import type { EditorSettings } from "@/lib/editor-settings";

interface Props {
  name: string;
  color: string;
  editorSettings: EditorSettings;
  onProfileChange: (name: string, color: string) => void;
  onEditorSettingsChange: (updates: Partial<EditorSettings>) => void;
  onClose: () => void;
}

export function SettingsDialog({
  name,
  color,
  editorSettings,
  onProfileChange,
  onEditorSettingsChange,
  onClose,
}: Props) {
  const [localName, setLocalName] = useState(name);

  // Persist the typed name when the field loses focus, mirroring how the color
  // swatches apply immediately on click.
  function commitName() {
    onProfileChange(localName || "Anonymous", color);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-96 overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        <Section title="Profile">
          <label className="mb-1 block text-sm font-medium">Display Name</label>
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={commitName}
            className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            placeholder="Your name"
          />

          <label className="mb-1 block text-sm font-medium">Cursor Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Cursor color ${c}`}
                onClick={() => onProfileChange(localName || "Anonymous", c)}
                className="h-7 w-7 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  outline:
                    color === c ? `2px solid ${c}` : "2px solid transparent",
                  outlineOffset: "2px",
                  transform: color === c ? "scale(1.1)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </Section>

        <Section title="Editor">
          <Toggle
            label="Vim mode"
            description="Use Vim keybindings in the code editor."
            checked={editorSettings.vimMode}
            onChange={(v) => onEditorSettingsChange({ vimMode: v })}
          />
          <Toggle
            label="Snippet autocomplete"
            description="Suggest Mermaid snippets as you type; press Tab to insert."
            checked={editorSettings.autocomplete}
            onChange={(v) => onEditorSettingsChange({ autocomplete: v })}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 border-t border-gray-100 pt-4 first:border-t-0 first:pt-0 dark:border-gray-800">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="mb-3 flex w-full items-center justify-between gap-3 text-left last:mb-0"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          {description}
        </span>
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
