import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../toolbar";

vi.mock("@/lib/user-identity", () => ({
  updateUserIdentity: vi.fn((updates) => ({
    userId: "u1",
    name: updates.name ?? "Alice",
    color: updates.color ?? "#E63946",
    ...updates,
  })),
}));

const defaultProps = {
  title: "My Diagram",
  onTitleChange: vi.fn(),
  diagramId: "test-id",
  user: { userId: "u1", name: "Alice", color: "#E63946" },
  onUserChange: vi.fn(),
};

describe("Toolbar", () => {
  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
  });

  it("renders title in input", () => {
    render(<Toolbar {...defaultProps} />);
    const input = screen.getByDisplayValue("My Diagram");
    expect(input).toBeInTheDocument();
  });

  it("calls onTitleChange when title edited", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    const input = screen.getByDisplayValue("My Diagram");
    await user.clear(input);
    await user.type(input, "New Title");

    expect(defaultProps.onTitleChange).toHaveBeenCalled();
  });

  it("copies URL to clipboard on Share click", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    await user.click(screen.getByText("Share"));
    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining("/d/test-id")
    );
  });

  it("shows Copied! feedback after share", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    await user.click(screen.getByText("Share"));
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("renders app name", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByText("Super Mermaid")).toBeInTheDocument();
  });

  it("renders user name and color dot", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("opens settings dialog on user button click", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    await user.click(screen.getByText("Alice"));
    expect(screen.getByText("User Settings")).toBeInTheDocument();
  });

  it("closes settings dialog on cancel", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    await user.click(screen.getByText("Alice"));
    expect(screen.getByText("User Settings")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("User Settings")).not.toBeInTheDocument();
  });

  it("calls onUserChange after settings save", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    await user.click(screen.getByText("Alice"));
    await user.click(screen.getByText("Save"));

    expect(defaultProps.onUserChange).toHaveBeenCalled();
  });
});
