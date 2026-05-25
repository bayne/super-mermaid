const STORAGE_KEY = "super-mermaid-editor-settings";

/**
 * Per-browser editor preferences. Unlike the diagram itself these are not
 * shared between collaborators — each user keeps their own editing experience.
 */
export interface EditorSettings {
  /** Enable Vim keybindings in the CodeMirror editor. */
  vimMode: boolean;
  /** Offer Tab-completable snippet suggestions while typing. */
  autocomplete: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  vimMode: false,
  autocomplete: true,
};

export function getEditorSettings(): EditorSettings {
  if (typeof window === "undefined") return DEFAULT_EDITOR_SETTINGS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_EDITOR_SETTINGS;
  try {
    return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

export function updateEditorSettings(
  updates: Partial<EditorSettings>
): EditorSettings {
  const updated = { ...getEditorSettings(), ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
