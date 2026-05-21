import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserSettingsDialog } from "../user-settings-dialog";

describe("UserSettingsDialog", () => {
  const defaultProps = {
    name: "Alice",
    color: "#E63946",
    onSave: vi.fn(),
    onClose: vi.fn(),
  };

  it("renders with initial name", () => {
    render(<UserSettingsDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText("Your name");
    expect(input).toHaveValue("Alice");
  });

  it("renders heading", () => {
    render(<UserSettingsDialog {...defaultProps} />);
    expect(screen.getByText("User Settings")).toBeInTheDocument();
  });

  it("calls onSave with updated name", async () => {
    const user = userEvent.setup();
    render(<UserSettingsDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("Your name");
    await user.clear(input);
    await user.type(input, "Bob");
    await user.click(screen.getByText("Save"));

    expect(defaultProps.onSave).toHaveBeenCalledWith("Bob", "#E63946");
  });

  it("calls onClose when Cancel clicked", async () => {
    const user = userEvent.setup();
    render(<UserSettingsDialog {...defaultProps} />);

    await user.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("defaults name to Anonymous if empty on save", async () => {
    const user = userEvent.setup();
    render(<UserSettingsDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText("Your name");
    await user.clear(input);
    await user.click(screen.getByText("Save"));

    expect(defaultProps.onSave).toHaveBeenCalledWith("Anonymous", "#E63946");
  });

  it("renders color swatches", () => {
    const { container } = render(<UserSettingsDialog {...defaultProps} />);
    const buttons = container.querySelectorAll("button");
    // 10 color swatches + Cancel + Save = 12
    expect(buttons.length).toBe(12);
  });
});
