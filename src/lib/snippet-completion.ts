import {
  autocompletion,
  acceptCompletion,
  closeCompletion,
  snippet,
  snippetKeymap,
  nextSnippetField,
  prevSnippetField,
  clearSnippet,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { keymap, type Command } from "@codemirror/view";
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
  for (const snippetDef of MERMAID_SNIPPETS) {
    const triggers = triggersFor(snippetDef);
    const match =
      triggers.find((t) => t.startsWith(typed)) ??
      (context.explicit ? triggers.find((t) => t.includes(typed)) : undefined);
    if (!match && !context.explicit) continue;

    options.push({
      label: match ?? snippetDef.label,
      detail: snippetDef.label,
      type: "snippet",
      // `snippet()` inserts the template and turns its `${field}` markers into
      // editable fields the user tabs through (see snippetCompletionExtension).
      // The trailing `${}` is a zero-width exit field placed after the whole
      // template, so the final Tab/Enter lands the cursor cleanly past the
      // snippet (e.g. after the closing `]`) instead of advancing nowhere and
      // letting Enter split the text it just inserted.
      apply: snippet(snippetDef.insert + "${}"),
      boost: scoreSnippet(snippetDef, diagramType, contextWords),
    });
  }

  if (options.length === 0) return null;
  // We do our own prefix matching, so disable CodeMirror's internal filtering.
  return { from: word.from, options, filter: false };
}

// Runs commands in order, stopping at the first that handles the key (returns
// true). Lets one binding express a clear priority — e.g. "accept a selected
// completion, otherwise advance the snippet field" — instead of relying on the
// fragile relative ordering of several same-precedence keymaps.
function firstThatHandles(...commands: Command[]): Command {
  return (view) => commands.some((cmd) => cmd(view));
}

/**
 * CodeMirror extension that completes Mermaid snippets as the user types,
 * accepts the highlighted suggestion with Tab/Enter, and lets the user tab
 * through the inserted snippet's `${field}` placeholders.
 */
export function snippetCompletionExtension(): Extension {
  return [
    // selectOnOpen: false means the popup opens with *no* option highlighted,
    // so Tab/Enter stay unambiguous while the user is still typing. The user
    // commits to a suggestion explicitly with ArrowUp/ArrowDown — only then
    // does acceptCompletion have a selection to accept.
    autocompletion({
      override: [snippetCompletions],
      icons: false,
      selectOnOpen: false,
    }),
    // Silence CodeMirror's built-in snippet keymap (it's installed at
    // Prec.highest the first time a snippet is inserted) so the bindings below
    // are the single source of truth for Tab/Enter/Escape while a snippet is
    // active — otherwise two highest-precedence Tab handlers race.
    snippetKeymap.of([]),
    // One Prec.highest keymap with explicit priority. For Tab/Enter:
    //   1. acceptCompletion — accepts the popup option, but only when one is
    //      explicitly selected (no-op otherwise, thanks to selectOnOpen:false).
    //   2. nextSnippetField — advances to the next `${field}` of an active
    //      snippet.
    // Both return false when they don't apply, so a bare Tab/Enter (no popup
    // selection, no active snippet) falls through to normal indentation /
    // newline. Prec.highest so this beats basicSetup's indent-with-tab binding.
    // Shift-Tab steps back a field; Escape closes the popup if open, else
    // abandons the snippet's remaining fields.
    Prec.highest(
      keymap.of([
        {
          key: "Tab",
          run: firstThatHandles(acceptCompletion, nextSnippetField),
          shift: prevSnippetField,
        },
        { key: "Enter", run: firstThatHandles(acceptCompletion, nextSnippetField) },
        { key: "Escape", run: firstThatHandles(closeCompletion, clearSnippet) },
      ])
    ),
  ];
}
