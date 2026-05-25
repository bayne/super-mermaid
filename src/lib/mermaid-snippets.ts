export interface MermaidSnippet {
  label: string;
  /**
   * A CodeMirror snippet template. `${name}` markers are editable fields the
   * user tabs through after the snippet is inserted (the name is the default
   * text); reusing a name links those fields so they edit together. Consumers
   * that need plain text (e.g. the snippet library) run it through
   * `plainSnippet()` to drop the markers.
   */
  insert: string;
  diagramType: string;
  keywords: string[];
}

export const MERMAID_SNIPPETS: MermaidSnippet[] = [
  // --- Diagram starters ---
  {
    label: "Flowchart",
    insert: "graph TD\n    ${A}[${Start}] --> ${B}[${End}]",
    diagramType: "starter",
    keywords: ["graph", "flowchart", "flow", "td", "lr"],
  },
  {
    label: "Sequence Diagram",
    insert:
      "sequenceDiagram\n    ${Alice}->>${Bob}: ${Hello}\n    ${Bob}-->>${Alice}: ${Hi}",
    diagramType: "starter",
    keywords: ["sequence", "message", "actor"],
  },
  {
    label: "Class Diagram",
    insert:
      "classDiagram\n    class ${Animal} {\n        +String ${name}\n        +${makeSound}()\n    }",
    diagramType: "starter",
    keywords: ["class", "uml", "oop"],
  },
  {
    label: "State Diagram",
    insert: "stateDiagram-v2\n    [*] --> ${Active}\n    ${Active} --> [*]",
    diagramType: "starter",
    keywords: ["state", "machine", "fsm"],
  },
  {
    label: "ER Diagram",
    insert:
      'erDiagram\n    ${CUSTOMER} ||--o{ ${ORDER} : ${places}\n    ${ORDER} ||--|{ ${LINE-ITEM} : ${contains}',
    diagramType: "starter",
    keywords: ["er", "entity", "relationship", "database"],
  },
  {
    label: "Gantt Chart",
    insert:
      "gantt\n    title ${Project}\n    dateFormat YYYY-MM-DD\n    section ${Phase 1}\n    ${Task 1}: 2024-01-01, 30d",
    diagramType: "starter",
    keywords: ["gantt", "project", "timeline"],
  },
  {
    label: "Pie Chart",
    insert: 'pie title ${Distribution}\n    "${A}" : 40\n    "${B}" : 30\n    "${C}" : 30',
    diagramType: "starter",
    keywords: ["pie", "chart"],
  },
  {
    label: "Mindmap",
    insert: "mindmap\n  root((${Topic}))\n    ${Branch A}\n      ${Leaf 1}\n    ${Branch B}",
    diagramType: "starter",
    keywords: ["mindmap", "mind", "map"],
  },

  // --- Flowchart nodes & edges ---
  {
    label: "Node [rect]",
    insert: "${X}[${Label}]",
    diagramType: "graph",
    keywords: ["node", "box", "rectangle"],
  },
  {
    label: "Node (round)",
    insert: "${X}(${Label})",
    diagramType: "graph",
    keywords: ["node", "rounded"],
  },
  {
    label: "Node {diamond}",
    insert: "${X}{${Label}}",
    diagramType: "graph",
    keywords: ["decision", "diamond", "if", "branch"],
  },
  {
    label: "Node ((circle))",
    insert: "${X}((${Label}))",
    diagramType: "graph",
    keywords: ["node", "circle"],
  },
  {
    label: "Node ([stadium])",
    insert: "${X}([${Label}])",
    diagramType: "graph",
    keywords: ["node", "pill", "stadium"],
  },
  {
    label: "Arrow -->",
    insert: "${A} --> ${B}",
    diagramType: "graph",
    keywords: ["arrow", "edge", "connect", "link"],
  },
  {
    label: "Arrow -.->",
    insert: "${A} -.-> ${B}",
    diagramType: "graph",
    keywords: ["dotted", "dashed"],
  },
  {
    label: "Arrow ==>",
    insert: "${A} ==> ${B}",
    diagramType: "graph",
    keywords: ["thick", "bold"],
  },
  {
    label: "Label |text|",
    insert: "${A} -->|${text}| ${B}",
    diagramType: "graph",
    keywords: ["label", "text", "edge"],
  },
  {
    label: "Subgraph",
    insert: "subgraph ${Title}\n    ${A} --> ${B}\nend",
    diagramType: "graph",
    keywords: ["subgraph", "group", "cluster", "container"],
  },
  {
    label: "Style",
    insert: "style ${X} fill:#f9f,stroke:#333",
    diagramType: "graph",
    keywords: ["style", "color", "fill"],
  },

  // --- Sequence diagram elements ---
  {
    label: "Message ->>",
    insert: "${Alice}->>${Bob}: ${Message}",
    diagramType: "sequence",
    keywords: ["message", "call", "send", "request"],
  },
  {
    label: "Reply -->>",
    insert: "${Bob}-->>${Alice}: ${Reply}",
    diagramType: "sequence",
    keywords: ["reply", "response", "return"],
  },
  {
    label: "Note",
    insert: "Note over ${Alice},${Bob}: ${Text}",
    diagramType: "sequence",
    keywords: ["note", "comment", "annotation"],
  },
  {
    label: "Alt/Else",
    insert:
      "alt ${Condition}\n    Alice->>Bob: Yes\nelse ${Otherwise}\n    Alice->>Bob: No\nend",
    diagramType: "sequence",
    keywords: ["alt", "if", "else", "condition", "branch"],
  },
  {
    label: "Loop",
    insert: "loop ${Every minute}\n    ${Alice}->>${Bob}: ${Ping}\nend",
    diagramType: "sequence",
    keywords: ["loop", "repeat", "while"],
  },
  {
    label: "Participant",
    insert: "participant ${Name}",
    diagramType: "sequence",
    keywords: ["participant", "actor", "person"],
  },
  {
    label: "Activate",
    insert: "activate ${Alice}\ndeactivate ${Alice}",
    diagramType: "sequence",
    keywords: ["activate", "deactivate", "lifeline"],
  },
  {
    label: "Rect/Box",
    insert: "rect rgb(200, 220, 255)\n    ${Alice}->>${Bob}: ${Inside box}\nend",
    diagramType: "sequence",
    keywords: ["rect", "box", "highlight", "background"],
  },

  // --- Class diagram elements ---
  {
    label: "Class",
    insert: "class ${ClassName} {\n    +String ${field}\n    +${method}()\n}",
    diagramType: "class",
    keywords: ["class", "type", "define"],
  },
  {
    label: "Inheritance",
    insert: "${Animal} <|-- ${Dog}",
    diagramType: "class",
    keywords: ["inherit", "extends", "parent"],
  },
  {
    label: "Composition",
    insert: "${Car} *-- ${Engine}",
    diagramType: "class",
    keywords: ["compose", "has", "owns"],
  },
  {
    label: "Aggregation",
    insert: "${Department} o-- ${Employee}",
    diagramType: "class",
    keywords: ["aggregate", "contains"],
  },
  {
    label: "Interface",
    insert: "class ${IAnimal} {\n    <<interface>>\n    +${makeSound}()\n}",
    diagramType: "class",
    keywords: ["interface", "abstract", "contract"],
  },

  // --- State diagram elements ---
  {
    label: "Transition",
    insert: "${s1} --> ${s2}: ${event}",
    diagramType: "state",
    keywords: ["transition", "arrow", "event"],
  },
  {
    label: "Fork",
    insert:
      "state ${fork} <<fork>>\n[*] --> ${fork}\n${fork} --> ${A}\n${fork} --> ${B}",
    diagramType: "state",
    keywords: ["fork", "parallel", "split"],
  },
  {
    label: "Choice",
    insert:
      "state ${choice} <<choice>>\n[*] --> ${choice}\n${choice} --> ${A}: yes\n${choice} --> ${B}: no",
    diagramType: "state",
    keywords: ["choice", "decision", "if"],
  },
  {
    label: "Composite",
    insert: "state ${Outer} {\n    [*] --> ${Inner}\n    ${Inner} --> [*]\n}",
    diagramType: "state",
    keywords: ["composite", "nested", "inner"],
  },

  // --- ER diagram elements ---
  {
    label: "Entity",
    insert: "${ENTITY} {\n    string ${name}\n    int ${id} PK\n}",
    diagramType: "er",
    keywords: ["entity", "table"],
  },
  {
    label: "One-to-Many",
    insert: '${A} ||--o{ ${B} : "${has}"',
    diagramType: "er",
    keywords: ["one", "many", "relationship"],
  },
  {
    label: "Many-to-Many",
    insert: '${A} }o--o{ ${B} : "${relates}"',
    diagramType: "er",
    keywords: ["many", "relationship"],
  },
];

/**
 * Strip CodeMirror snippet field markers from a template, leaving each field's
 * default text. `"${X}[${Label}]"` becomes `"X[Label]"`. Used where the raw
 * text is wanted without the interactive placeholder behavior.
 */
export function plainSnippet(template: string): string {
  return template.replace(/[#$]\{(?:\d+:)?([^{}]*)\}/g, "$1");
}

export function detectDiagramType(content: string): string | null {
  const firstLine = content.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
  if (firstLine.startsWith("graph") || firstLine.startsWith("flowchart"))
    return "graph";
  if (firstLine.startsWith("sequencediagram")) return "sequence";
  if (firstLine.startsWith("classdiagram")) return "class";
  if (firstLine.startsWith("statediagram")) return "state";
  if (firstLine.startsWith("erdiagram")) return "er";
  if (firstLine.startsWith("gantt")) return "gantt";
  if (firstLine.startsWith("pie")) return "pie";
  if (firstLine.startsWith("mindmap")) return "mindmap";
  return null;
}

export function scoreSnippet(
  snippet: MermaidSnippet,
  diagramType: string | null,
  contextWords: string[]
): number {
  let score = 0;

  if (!diagramType) {
    if (snippet.diagramType === "starter") score += 100;
    else score -= 50;
  } else {
    if (snippet.diagramType === diagramType) score += 50;
    else if (snippet.diagramType === "starter") score -= 10;
    else score -= 30;
  }

  for (const keyword of snippet.keywords) {
    if (contextWords.some((w) => w.includes(keyword) || keyword.includes(w))) {
      score += 10;
    }
  }

  return score;
}

export function getContextWords(content: string, cursorLine: number): string[] {
  const lines = content.split("\n");
  const start = Math.max(0, cursorLine - 3);
  const end = Math.min(lines.length, cursorLine + 3);
  const context = lines.slice(start, end).join(" ").toLowerCase();
  return context.split(/[^a-zA-Z]+/).filter((w) => w.length > 1);
}
