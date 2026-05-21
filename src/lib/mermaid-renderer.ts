import mermaid from "mermaid";

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "default",
  });
  initialized = true;
}

let renderCounter = 0;

export async function renderMermaid(
  source: string
): Promise<{ svg: string; error: string | null }> {
  ensureInitialized();

  if (!source.trim()) {
    return { svg: "", error: null };
  }

  try {
    const id = `mermaid-${++renderCounter}`;
    const { svg } = await mermaid.render(id, source);
    return { svg, error: null };
  } catch (e) {
    return {
      svg: "",
      error: e instanceof Error ? e.message : "Failed to parse diagram",
    };
  }
}
