import mermaid from "mermaid";

let currentTheme: string | null = null;

function ensureInitialized(theme: "default" | "dark") {
  if (currentTheme === theme) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
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
