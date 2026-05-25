import { describe, it, expect, beforeEach } from "vitest";
import {
  getEditorSettings,
  updateEditorSettings,
  DEFAULT_EDITOR_SETTINGS,
} from "../editor-settings";

const KEY = "super-mermaid-editor-settings";

describe("editor-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when nothing is stored", () => {
    expect(getEditorSettings()).toEqual(DEFAULT_EDITOR_SETTINGS);
  });

  it("returns defaults when stored value is malformed", () => {
    localStorage.setItem(KEY, "not json");
    expect(getEditorSettings()).toEqual(DEFAULT_EDITOR_SETTINGS);
  });

  it("merges stored settings over defaults", () => {
    localStorage.setItem(KEY, JSON.stringify({ vimMode: true }));
    expect(getEditorSettings()).toEqual({ vimMode: true, autocomplete: true });
  });

  it("persists partial updates", () => {
    const updated = updateEditorSettings({ autocomplete: false });
    expect(updated.autocomplete).toBe(false);
    expect(getEditorSettings().autocomplete).toBe(false);
    // unrelated field retains its default
    expect(getEditorSettings().vimMode).toBe(false);
  });
});
