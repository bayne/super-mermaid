import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PresenceBar } from "../presence-bar";
import type { PresenceState } from "@/lib/types";

const users: PresenceState[] = [
  { userId: "u1", name: "Alice", color: "#E63946", onlineSince: "2024-01-01" },
  { userId: "u2", name: "Bob", color: "#457B9D", onlineSince: "2024-01-01" },
];

describe("PresenceBar", () => {
  it("renders nothing when users array is empty", () => {
    const { container } = render(
      <PresenceBar users={[]} currentUserId="u1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders user avatars with correct initials", () => {
    render(<PresenceBar users={users} currentUserId="u1" />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("shows (you) label for current user", () => {
    render(<PresenceBar users={users} currentUserId="u1" />);
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("does not show (you) for other users", () => {
    render(<PresenceBar users={users} currentUserId="u1" />);
    const youLabels = screen.getAllByText("(you)");
    expect(youLabels).toHaveLength(1);
  });

  it("shows Online label", () => {
    render(<PresenceBar users={users} currentUserId="u1" />);
    expect(screen.getByText("Online:")).toBeInTheDocument();
  });
});
