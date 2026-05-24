import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "../markdown";

describe("Markdown", () => {
  it("renders headings, emphasis and links", () => {
    render(
      <Markdown content={"# Title\n\nSome **bold** and [a link](https://example.com)"} />
    );
    expect(screen.getByText("Title").tagName).toBe("H1");
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    const link = screen.getByText("a link") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.href).toBe("https://example.com/");
    expect(link.target).toBe("_blank");
  });

  it("renders ordered and unordered lists", () => {
    render(<Markdown content={"- one\n- two\n\n1. first\n2. second"} />);
    expect(screen.getByText("one").closest("ul")).toBeInTheDocument();
    expect(screen.getByText("first").closest("ol")).toBeInTheDocument();
  });

  it("renders inline and block code", () => {
    render(<Markdown content={"inline `x` here\n\n```js\nconst y = 1;\n```"} />);
    expect(screen.getByText("x").tagName).toBe("CODE");
    expect(screen.getByText("const y = 1;")).toBeInTheDocument();
  });

  it("renders blockquotes and gfm tables", () => {
    render(
      <Markdown
        content={
          "> a quote\n\n| H1 | H2 |\n| -- | -- |\n| a | b |"
        }
      />
    );
    expect(screen.getByText("a quote").closest("blockquote")).toBeInTheDocument();
    expect(screen.getByText("H1").tagName).toBe("TH");
    expect(screen.getByText("a").tagName).toBe("TD");
  });
});
