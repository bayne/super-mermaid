import mermaid from "mermaid";

let currentTheme: string | null = null;

function ensureInitialized(theme: "default" | "dark") {
  if (currentTheme === theme) return;
  mermaid.initialize({
    startOnLoad: false,
    // Diagram source is untrusted: it's authored by any collaborator in a
    // shared room and the resulting SVG is injected via dangerouslySetInnerHTML
    // (see PreviewPanel). "strict" keeps mermaid's DOMPurify sanitization on and
    // disables click/JS directives, so a malicious diagram can't run script in
    // collaborators' browsers. Do NOT relax this to "loose"/"antiscript".
    securityLevel: "strict",
    // Without this, a parse error makes mermaid draw its "bomb" error
    // diagram into a temp <div> appended to document.body and then throw
    // before cleaning it up, leaving the bomb orphaned at the bottom of the
    // page. Suppressing it removes the temp element and just throws, so we
    // surface the error via line highlighting instead.
    suppressErrorRendering: true,
    theme,
  });
  currentTheme = theme;
}

let renderCounter = 0;

export function parseErrorLine(error: string): number | null {
  const patterns = [/line\s+(\d+)/i, /at position\s+\d+.*?line\s+(\d+)/i];
  for (const pattern of patterns) {
    const match = error.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

export interface RenderResult {
  svg: string;
  error: string | null;
  errorLine: number | null;
}

export async function renderMermaid(
  source: string,
  theme: "default" | "dark" = "default"
): Promise<RenderResult> {
  ensureInitialized(theme);

  if (!source.trim()) {
    return { svg: "", error: null, errorLine: null };
  }

  try {
    const id = `mermaid-${++renderCounter}`;
    const { svg } = await mermaid.render(id, source);
    return { svg, error: null, errorLine: null };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to parse diagram";
    return {
      svg: "",
      error,
      errorLine: parseErrorLine(error),
    };
  }
}
