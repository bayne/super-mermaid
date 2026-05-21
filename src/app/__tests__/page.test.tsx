import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import Home from "../page";

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "abc1234567"),
}));

describe("Home", () => {
  it("renders heading", () => {
    render(<Home />);
    expect(screen.getByText("Super Mermaid")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<Home />);
    expect(
      screen.getByText("Collaborative Mermaid.js diagram editor")
    ).toBeInTheDocument();
  });

  it("renders New Diagram button", () => {
    render(<Home />);
    expect(screen.getByText("New Diagram")).toBeInTheDocument();
  });

  it("navigates to /d/[id] on button click", async () => {
    const user = userEvent.setup();
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      refresh: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    });

    render(<Home />);
    await user.click(screen.getByText("New Diagram"));

    expect(mockPush).toHaveBeenCalledWith("/d/abc1234567");
  });
});
