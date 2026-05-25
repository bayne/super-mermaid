import { describe, it, expect } from "vitest";
import {
  MERMAID_SNIPPETS,
  detectDiagramType,
  scoreSnippet,
  getContextWords,
  plainSnippet,
} from "../mermaid-snippets";

describe("detectDiagramType", () => {
  it("detects graph", () => {
    expect(detectDiagramType("graph TD\n  A --> B")).toBe("graph");
  });

  it("detects flowchart", () => {
    expect(detectDiagramType("flowchart LR\n  A --> B")).toBe("graph");
  });

  it("detects sequenceDiagram", () => {
    expect(detectDiagramType("sequenceDiagram\n  Alice->>Bob: Hi")).toBe(
      "sequence"
    );
  });

  it("detects classDiagram", () => {
    expect(detectDiagramType("classDiagram\n  class Foo")).toBe("class");
  });

  it("detects stateDiagram", () => {
    expect(detectDiagramType("stateDiagram-v2\n  [*] --> A")).toBe("state");
  });

  it("detects erDiagram", () => {
    expect(detectDiagramType("erDiagram\n  A ||--o{ B : has")).toBe("er");
  });

  it("detects gantt", () => {
    expect(detectDiagramType("gantt\n  title X")).toBe("gantt");
  });

  it("detects pie", () => {
    expect(detectDiagramType('pie title X\n  "A" : 50')).toBe("pie");
  });

  it("detects mindmap", () => {
    expect(detectDiagramType("mindmap\n  root")).toBe("mindmap");
  });

  it("returns null for empty content", () => {
    expect(detectDiagramType("")).toBeNull();
  });

  it("returns null for unrecognized content", () => {
    expect(detectDiagramType("hello world")).toBeNull();
  });
});

describe("scoreSnippet", () => {
  const graphSnippet = MERMAID_SNIPPETS.find(
    (s) => s.diagramType === "graph" && s.label === "Arrow -->"
  )!;
  const starterSnippet = MERMAID_SNIPPETS.find(
    (s) => s.diagramType === "starter" && s.label === "Flowchart"
  )!;

  it("ranks matching diagram type snippets high", () => {
    const score = scoreSnippet(graphSnippet, "graph", []);
    expect(score).toBeGreaterThan(0);
  });

  it("ranks starters high when no diagram type detected", () => {
    const score = scoreSnippet(starterSnippet, null, []);
    expect(score).toBeGreaterThan(50);
  });

  it("ranks non-matching snippets low", () => {
    const score = scoreSnippet(graphSnippet, "sequence", []);
    expect(score).toBeLessThan(0);
  });

  it("boosts score for keyword matches", () => {
    const base = scoreSnippet(graphSnippet, "graph", []);
    const boosted = scoreSnippet(graphSnippet, "graph", ["arrow", "connect"]);
    expect(boosted).toBeGreaterThan(base);
  });
});

describe("getContextWords", () => {
  it("extracts words from lines around cursor", () => {
    const content = "graph TD\n  A --> B\n  C --> D";
    const words = getContextWords(content, 2);
    expect(words).toContain("graph");
    expect(words).toContain("td");
  });

  it("handles cursor at beginning", () => {
    const words = getContextWords("graph TD", 1);
    expect(words).toContain("graph");
  });

  it("returns empty for empty content", () => {
    const words = getContextWords("", 1);
    expect(words).toEqual([]);
  });
});

describe("MERMAID_SNIPPETS", () => {
  it("has snippets for all main diagram types", () => {
    const types = new Set(MERMAID_SNIPPETS.map((s) => s.diagramType));
    expect(types).toContain("starter");
    expect(types).toContain("graph");
    expect(types).toContain("sequence");
    expect(types).toContain("class");
    expect(types).toContain("state");
    expect(types).toContain("er");
  });

  it("all snippets have required fields", () => {
    for (const s of MERMAID_SNIPPETS) {
      expect(s.label).toBeTruthy();
      expect(s.insert).toBeTruthy();
      expect(s.diagramType).toBeTruthy();
      expect(s.keywords.length).toBeGreaterThan(0);
    }
  });
});

describe("plainSnippet", () => {
  it("strips field markers, keeping the default text", () => {
    expect(plainSnippet("${X}[${Label}]")).toBe("X[Label]");
    expect(plainSnippet("${A} --> ${B}")).toBe("A --> B");
    expect(plainSnippet("${X}{${Label}}")).toBe("X{Label}");
  });

  it("leaves literal braces and color hashes alone", () => {
    expect(plainSnippet("style ${X} fill:#f9f,stroke:#333")).toBe(
      "style X fill:#f9f,stroke:#333"
    );
    expect(plainSnippet('${A} ||--o{ ${B} : "${has}"')).toBe(
      'A ||--o{ B : "has"'
    );
  });

  it("produces marker-free text for every snippet", () => {
    for (const s of MERMAID_SNIPPETS) {
      expect(plainSnippet(s.insert)).not.toMatch(/[#$]\{/);
    }
  });
});
