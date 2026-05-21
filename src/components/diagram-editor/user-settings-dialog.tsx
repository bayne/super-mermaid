"use client";

import { useState } from "react";
import { COLORS } from "@/lib/colors";

interface Props {
  name: string;
  color: string;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
}

export function UserSettingsDialog({ name, color, onSave, onClose }: Props) {
  const [localName, setLocalName] = useState(name);
  const [localColor, setLocalColor] = useState(color);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold">User Settings</h2>

        <label className="mb-1 block text-sm font-medium">Display Name</label>
        <input
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="Your name"
        />

        <label className="mb-1 block text-sm font-medium">Cursor Color</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setLocalColor(c)}
              className="h-7 w-7 rounded-full transition-transform"
              style={{
                backgroundColor: c,
                outline:
                  localColor === c ? `2px solid ${c}` : "2px solid transparent",
                outlineOffset: "2px",
                transform: localColor === c ? "scale(1.1)" : "scale(1)",
              }}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(localName || "Anonymous", localColor)}
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
