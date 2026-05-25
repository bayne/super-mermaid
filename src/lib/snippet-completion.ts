import {
  autocompletion,
  acceptCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { Prec, type Extension } from "@codemirror/state";
import {
  MERMAID_SNIPPETS,
  detectDiagramType,
  scoreSnippet,
  getContextWords,
  type MermaidSnippet,
} from "./mermaid-snippets";

// The word the user is actively typing — what we try to complete.
const TOKEN = /[\w-]+/;

/**
 * The triggers a snippet can be completed from. We index on its keywords (the
 * words a user is likely to type, e.g. "loop", "subgraph") plus the leading
 * alphabetic run of its label so "Flowchart" is reachable by typing "flow".
 */
function triggersFor(snippet: MermaidSnippet): string[] {
  const labelToken = snippet.label.toLowerCase().match(/^[a-z]+/)?.[0];
  const triggers = new Set(snippet.keywords.map((k) => k.toLowerCase()));
  if (labelToken && labelToken.length > 1) triggers.add(labelToken);
  return [...triggers];
}

export function snippetCompletions(
  context: CompletionContext
): CompletionResult | null {
  const word = context.matchBefore(TOKEN);
  // Only surface suggestions once the user has typed something, unless the
  // completion was explicitly requested (Ctrl-Space).
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const typed = word.text.toLowerCase();
  const doc = context.state.doc.toString();
  const diagramType = detectDiagramType(doc);
  const cursorLine = context.state.doc.lineAt(context.pos).number;
  const contextWords = getContextWords(doc, cursorLine);

  const options: Completion[] = [];
  for (const snippet of MERMAID_SNIPPETS) {
    const triggers = triggersFor(snippet);
    const match =
      triggers.find((t) => t.startsWith(typed)) ??
      (context.explicit ? triggers.find((t) => t.includes(typed)) : undefined);
    if (!match && !context.explicit) continue;

    options.push({
      label: match ?? snippet.label,
      detail: snippet.label,
      type: "snippet",
      apply: snippet.insert,
      boost: scoreSnippet(snippet, diagramType, contextWords),
    });
  }

  if (options.length === 0) return null;
  // We do our own prefix matching, so disable CodeMirror's internal filtering.
  return { from: word.from, options, filter: false };
}

/**
 * CodeMirror extension that completes Mermaid snippets as the user types and
 * accepts the highlighted suggestion with Tab.
 */
export function snippetCompletionExtension(): Extension {
  return [
    autocompletion({ override: [snippetCompletions], icons: false }),
    // Tab accepts the active completion; falls through to default Tab handling
    // (indentation) when the autocomplete popup is closed. Prec.highest so it
    // beats the indent-with-tab binding from basicSetup.
    Prec.highest(keymap.of([{ key: "Tab", run: acceptCompletion }])),
  ];
}
