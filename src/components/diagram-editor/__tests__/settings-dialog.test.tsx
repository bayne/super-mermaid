import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsDialog } from "../settings-dialog";

function setup(overrides = {}) {
  const props = {
    name: "Alice",
    color: "#E63946",
    editorSettings: { vimMode: false, autocomplete: true },
    onProfileChange: vi.fn(),
    onEditorSettingsChange: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<SettingsDialog {...props} />);
  return props;
}

describe("SettingsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the profile name", () => {
    setup();
    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Alice");
  });

  it("commits the name on blur, defaulting empty to Anonymous", async () => {
    const user = userEvent.setup();
    const props = setup();
    const input = screen.getByPlaceholderText("Your name");
    await user.clear(input);
    await user.tab();
    expect(props.onProfileChange).toHaveBeenCalledWith("Anonymous", "#E63946");
  });

  it("toggles vim mode", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("switch", { name: /vim mode/i }));
    expect(props.onEditorSettingsChange).toHaveBeenCalledWith({ vimMode: true });
  });

  it("toggles snippet autocomplete off", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("switch", { name: /snippet autocomplete/i }));
    expect(props.onEditorSettingsChange).toHaveBeenCalledWith({
      autocomplete: false,
    });
  });

  it("picks a cursor color", async () => {
    const user = userEvent.setup();
    const props = setup();
    const swatches = screen.getAllByLabelText(/^Cursor color /);
    await user.click(swatches[swatches.length - 1]);
    expect(props.onProfileChange).toHaveBeenCalled();
  });

  it("calls onClose from the close button", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByLabelText("Close settings"));
    expect(props.onClose).toHaveBeenCalled();
  });
});
