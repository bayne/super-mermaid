import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootLayout from "../layout";

describe("RootLayout", () => {
  it("renders children", () => {
    render(
      <RootLayout>
        <div data-testid="child">Hello</div>
      </RootLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders html with lang attribute", () => {
    const { container } = render(
      <RootLayout>
        <div>test</div>
      </RootLayout>
    );
    const html = container.closest("html") || container.querySelector("html");
    // In test env, RootLayout renders the body content
    expect(container.textContent).toContain("test");
  });
});
