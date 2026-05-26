#!/usr/bin/env python3
"""Convert source.md (a Claude session transcript) into a single HTML file.

User turns are shown verbatim. Assistant turns are collapsed into a
<details> element whose <summary> is a hand-written two-sentence summary;
expanding reveals the full, markdown-rendered assistant reply.

Summaries are matched to assistant turns by a UNIQUE ANCHOR substring rather
than by position, so reordering source.md can't silently misalign them. The
build fails loudly if any anchor is missing or matches more than one turn.
"""
import html
import re
import sys
import markdown

SRC = "source.md"
OUT = "source.html"

SESSION_LIMIT_PREFIX = "You've hit your session limit"
SESSION_LIMIT_SUMMARY = "The session limit was reached before a response could be produced. (The request was retried in a later turn.)"

# (anchor, summary). The anchor must appear in exactly one assistant turn.
SUMMARIES = [
    ("no Supabase documentation in the Smarty McFly",
     "Reported that no Supabase docs were installed in Smarty McFly yet. Offered to fetch them and asked which aspect (JS client, CLI, Edge Functions, etc.) to prioritize."),
    ("Yep, it's there now",
     "Confirmed the Supabase docs are now installed and cover auth, storage, realtime, the clients, and CLI. Invited questions."),
    ("**Next.js + React** is the clear first choice",
     "Recommended Next.js + React with @supabase/supabase-js as the realtime stack, citing Supabase's own examples and Broadcast/Presence/Postgres Changes support. Flagged that true conflict-free editing would require layering a CRDT like Yjs on top of Broadcast."),
    ("a collaborative Mermaid.js diagram editor where users share a URL",
     "Researched the docs and produced a plan for \"Super Mermaid,\" a collaborative diagram editor on Next.js, CodeMirror, Mermaid, and Supabase Realtime with a last-write-wins sync model. Raised two open questions about auth choice and read-only viewing."),
    ("Got it — much simpler. No auth, link-sharing rooms",
     "Updated the plan for no-auth tokenized rooms with localStorage identity, then scaffolded and built the entire app — landing page, editor, realtime content/cursor/presence sync, and persistence. Summarized everything built and asked whether to start the dev server or set up Supabase first."),
    ("significant refactor across several dimensions",
     "Planned a four-phase refactor: npm→bun, type-safe Supabase integration, Vercel analytics, and a 90% Vitest coverage suite. Noted the code is already lean, so the main simplification is auto-generating DB types."),
    ("Phase 1 — npm to bun",
     "Executed all four phases — switched to bun, added a typed Supabase client and config, wired in Vercel analytics plus a Makefile and README, and built a test suite meeting the coverage thresholds. Listed each phase's deliverables and final metrics."),
    ("The Supabase client is failing because the",
     "Diagnosed the crash as a missing .env.local leaving NEXT_PUBLIC_SUPABASE_URL undefined. Offered two fixes — copy the example for a real project, or run the local Supabase stack — and asked which setup applies."),
    ("both Supabase and Vercel are already linked",
     "Provided the exact npx supabase and vercel CLI commands to push the migration, pull and set env vars, and deploy, with a recommended order. Noted both projects are already linked and gave their refs."),
    ("harmless browser console warning",
     "Explained the __cf_bm cookie warning is a harmless Cloudflare bot-management cookie rejected for a cross-origin domain. No action is needed."),
    ('"Anyone can read diagrams"` uses `USING (true)`',
     "Replaced the open \"anyone can read\" RLS policy with a SECURITY DEFINER get_diagram() RPC that returns only a single row by id, preventing bulk token enumeration. Updated the client, types, and tests; the migration must be applied manually."),
    ("`useSyncExternalStore` requires cached/stable snapshot results",
     "Fixed a useSyncExternalStore infinite re-render loop caused by getUserIdentity returning a fresh object on every call. Cached the parsed identity so it returns a stable reference until the underlying localStorage string changes."),
    ("subscribed before presence callbacks are registered",
     "Restructured the realtime channel lifecycle into three phases — create, register callbacks, then subscribe — so presence listeners attach before subscribe() as Supabase requires. Split usePresence into separate registration and tracking effects."),
    ("Dark mode matching between editor and preview",
     "Implemented synced light/dark theming between editor and preview, error-line highlighting parsed from Mermaid errors, and a context-sorted snippet library at the bottom of the editor. Added tests and confirmed all checks and coverage thresholds pass."),
    ("Shared Claude Chat (bottom half of screen)",
     "Built a shared Claude chat in the bottom half of the screen that streams responses over Supabase realtime so every collaborator follows along. Each user's API key stays in their browser, and only users with a key can send messages."),
    ("### AWS Bedrock Support",
     "Added AWS Bedrock as a second Claude provider alongside Anthropic, with a credential form and header-based auth, switching the route to the Node.js runtime for SDK compatibility. Listed the file changes and the new bedrock-sdk dependency."),
    ("what needs to be made responsive",
     "Made the layout responsive so the editor, preview, and chat stack vertically on narrow screens and sit side-by-side at the md breakpoint, with a more compact toolbar. All checks pass."),
    ("Let me investigate the deep linking setup",
     "Traced the broken deep links to an SSR/hydration bug where EditorClient copied the useSyncExternalStore value into useState, capturing a null server snapshot that never updated. Fixed it by making useSyncExternalStore the sole source of truth so React re-renders with the client value."),
    ("find the cursor positioning issue",
     "Found the text cursor sat too low because Tailwind's text-sm forces a line-height that conflicts with CodeMirror's own calculations. Moved the font-size onto .cm-editor in CSS and dropped text-sm so CodeMirror manages its own line-height."),
    ("remote cursor widget implementation",
     "The remote-cursor widget anchored to the top with a hardcoded 1.2em height, so the visible bar sat too low. Re-anchored it to the baseline (bottom:0), bumped the height to 1.4em, and repositioned the name label relative to the bar."),
    ("find the word selector component",
     "Located the snippet library bar as the source of the unwanted horizontal scrollbar and added Tailwind's scrollbar-none utility to hide it while keeping scroll functionality. All checks pass."),
    ("the model is hardcoded to `us.anthropic.claude-sonnet-4-6-v1:0`",
     "Added per-provider model selection through a dropdown in the auth form, reading the chosen model from a request header instead of hardcoded constants. Updated the auth interfaces, hook headers, UI, and tests."),
    ("save that as a reference memory for future use",
     "Saved the AWS Bedrock 1M-context Opus model identifier to memory for future reference."),
    ("The current Opus entry uses `:0` suffix instead of `[1m]`",
     "Found the Bedrock models in claude-auth.ts and updated both Opus entries from the :0 suffix to the [1m] 1M-context variant. All checks pass and the memory note was updated to reflect project use."),
    ("error is from AWS, not our code",
     "Explained the 400 \"not authorized\" error originates from AWS, not the code, and listed three likely causes: model access not enabled for the 1M variant, cross-region inference, and IAM permissions. Pointed to enabling the 1M Opus model in the console as the most common culprit."),
    ("Claude API calls now go directly from the browser to Anthropic/AWS",
     "Moved Claude API calls to run directly from the browser — created claude-client.ts, deleted the /api/chat route, and swapped to browser-compatible SDKs. Anthropic uses direct fetch with the CORS opt-in header while Bedrock uses the AWS SDK."),
    ("likely source of the horizontal overflow",
     "Diagnosed the persistent horizontal scrollbar as a flexbox min-width:auto problem letting the wide Mermaid SVG push past the viewport. Added min-w-0 to the nested flex containers, overflow-x-hidden on body, and constrained the SVG to scale down."),
    ("The non-prefixed models are in `src/lib/claude-auth.ts` lines 28-30",
     "Prefixed every Bedrock model id with us. and removed the now-duplicate non-prefixed entries, simplifying their labels. All checks pass."),
    ("The code uses `ConverseStream` (`bedrock-runtime:ConverseStream`)",
     "Switched the Bedrock integration from ConverseStream to InvokeModelWithResponseStream, which relies on a different, more commonly granted IAM action. Noted the IAM policy requirement and that the mocked tests needed no changes."),
    ("We've now tried both streaming Bedrock APIs",
     "Noted that both streaming Bedrock APIs now fail identically, pointing to IAM policy or unenabled model access as the real cause. Offered to try the non-streaming InvokeModel fallback or to check IAM permissions first."),
    ("Claude subscription (OAuth) auth — new third provider",
     "Added Claude subscription (OAuth) auth as a third provider and decoupled model selection from auth into a separate logical model list resolved at request time. Flagged a CORS risk on the OAuth endpoints and the required exact CLI system prefix."),
    ("Anthropic does not support calling the API directly from browser",
     "Explained that Anthropic doesn't support production browser calls and that the only opt-in header doesn't cover the OAuth token endpoint, which emits no CORS headers. Recommended reintroducing a small server-side Route Handler to proxy the OAuth (and ideally the messages) calls."),
    ("nothing that runs inside the browser's JavaScript sandbox can bypass CORS",
     "Explained that nothing in the browser's JS sandbox — workers, WASM, or service workers — can bypass CORS, since they all go through fetch. Only out-of-page code (a browser extension, a local helper, or a risky public proxy) can, so the backend Route Handler remains the best path."),
    ("In-browser BitTorrent clients (WebTorrent is the real one)",
     "Explained that in-browser BitTorrent clients dodge CORS by using WebRTC data channels and WebSocket trackers — transports that aren't CORS-gated — rather than HTTP. That trick can't reach Anthropic's fixed HTTPS OAuth endpoint, so the Route Handler is still required."),
    ("subscription now runs through server routes",
     "Implemented server-side route handlers for the OAuth exchange and message streaming, storing tokens in an httpOnly cookie so they never reach JavaScript. Shrank the client SubscriptionAuth to a marker, documented the architecture, and confirmed all checks pass."),
    ("write directly into the diagram editor** via tool use",
     "Gave the chat agent an update_editor tool and turned streamChatMessage into a bounded agentic tool loop so it writes directly into the shared diagram instead of telling users to copy/paste. Updated the system prompt and added tests, while flagging it wasn't exercised against a live model."),
    ("Markdown rendering for Claude responses",
     "Added markdown rendering for Claude replies, a conversation export button that builds a Markdown transcript download, and replaced the streaming partial text with a spinner until the reply lands. Added tests and confirmed all checks and coverage pass."),
    ("committed in worktree branch `worktree-fix-syntax-error-highlight`",
     "Traced the stray \"bomb icon\" error to Mermaid drawing its default error diagram into an orphaned temp div before throwing. Fixed it by setting suppressErrorRendering:true, added a regression test, verified, and committed in the worktree branch."),
    ('item 4 references "the items found below" but no list was included',
     "Built a settings dialog, vim mode via @replit/codemirror-vim, and snippet tab-autocomplete, plus an env-gated GitHub OAuth login scaffold. Flagged that item 4's referenced list was missing and that the GitHub PR workflow needs product decisions before wiring it live."),
    ("removing all GitHub work, keeping the snippet tab-autocomplete",
     "Removed all GitHub-related code, routes, and docs while keeping the settings view, vim mode, and tab autocomplete. Re-verified everything green and reiterated the open question about item 4's intended completion list."),
    ("Tab-completing a Mermaid snippet now drops you into its editable parts",
     "Converted each snippet into a CodeMirror snippet template with ${field} placeholders and bound Tab/Enter (plus Shift-Tab and Escape) to field navigation. Added plainSnippet() so the click-to-insert library still pastes literal text; all checks pass."),
    ("Added `selectOnOpen: false` to the `autocompletion(...)` config",
     "Added selectOnOpen:false so the completion popup opens with nothing highlighted, keeping Tab/Enter unambiguous until the user explicitly picks an option with the arrow keys. All checks pass."),
    ("via a `firstThatHandles(...)` helper",
     "Reworked Tab/Enter into one deterministic composite handler that accepts a selected completion, else advances the snippet field, else falls through to indent. Silenced CodeMirror's built-in snippet keymap to remove the precedence race between two Tab handlers."),
    ("I proved it with a real `EditorView` integration test",
     "Proved the keymap fix works by replaying the exact keystrokes through a real EditorView, which produced A[B], concluding the user was running stale code. Added a regression test and jsdom layout stubs so it can't silently regress."),
    ("freshly-built `extensions` array and an inline `basicSetup",
     "Found the real culprit: EditorPanel rebuilt its extensions array and inline basicSetup object every render, so each keystroke reconfigured CodeMirror and discarded the active snippet's state. Memoized extensions, hoisted basicSetup to a constant, added a real-EditorPanel regression test, and appended a trailing exit field so the final Enter yields A[B]."),
    ("I'll strip the positional caret/arrow line from the error message at its source",
     "Added stripPositionIndicator() to remove Mermaid's misaligned caret/arrow line from the displayed error while still parsing the line number from the raw message. Kept the readable source-echo line and added test coverage."),
    ("preserve the original error and fix the display instead",
     "Reverted the stripping and instead wrapped the error in a <pre> with whitespace-pre and font-mono so newlines and the caret line align accurately. Restored the renderer and its test to their original state."),
    ("The error is already rendered safely — React escapes",
     "Confirmed the error already renders safely — React escapes the {error} text child so no markup is interpreted, and font-mono makes it monospaced. Offered to adjust if something specific was still showing through."),
    ("## Security Audit — Claude Token Handling",
     "Audited how the app stores and transmits Claude/Anthropic/AWS credentials across all three providers. Found the subscription path solid but flagged a critical Mermaid loose-securityLevel stored-XSS and high-severity plaintext-localStorage secrets, plus CSP, CSRF, and cookie-hardening items."),
    ("Finding 1 — Mermaid stored-XSS (Critical)",
     "Fixed Finding 1 by switching Mermaid to securityLevel:strict with a regression test, and Finding 2 by moving the Anthropic/Bedrock secrets into the server-side httpOnly-cookie + proxy pattern so no secret touches localStorage. The full verification suite passes."),
    ("collapse to subscription-only and remove the Anthropic API key and AWS Bedrock providers",
     "Collapsed the app to subscription-only, deleting the Anthropic API key and AWS Bedrock providers, their routes and tests, the AWS SDK dependency, and the stale Bedrock memory. All checks pass and the routes reduce to messages, oauth, and the editor page."),
    ("This project uses Supabase Realtime as its collaboration backbone",
     "Confirmed the project uses Supabase Realtime as its collaboration backbone via a per-diagram channel for content sync, cursor sync, and presence. Noted persistence uses regular Postgres tables, not postgres_changes."),
    ("uses **only** Realtime `broadcast` and `presence`",
     "Explained the Supabase dashboard looks empty because the app uses only Realtime broadcast and presence, which never touch the database and leave no persistent log. Pointed to the Realtime Inspector and Reports to see it working live."),
    ("`postgres_changes` is a different Realtime mechanism",
     "Explained postgres_changes taps Postgres's WAL to push committed row changes, giving durable, reconnect-safe, DB-backed sync. Noted it's overkill and slower/pricier for the app's live cursor/keystroke collaboration, which intentionally uses broadcast."),
    ("Created `source.html` from `source.md`",
     "Read and parsed the transcript, then generated source.html with user turns shown in full and assistant turns collapsed into two-sentence summaries. Verified the structure counts and offered to keep or remove the build script."),
]

md = markdown.Markdown(extensions=["fenced_code", "tables", "sane_lists"])


def render_md(text):
    md.reset()
    return md.convert(text)


def parse_segments(raw):
    segments = []
    cur_type = None
    cur_lines = []
    marker = re.compile(r"^@@> (system|user|assistant):\s*$")
    for line in raw.split("\n"):
        m = marker.match(line)
        if m:
            if cur_type is not None:
                segments.append((cur_type, "\n".join(cur_lines)))
            cur_type = m.group(1)
            cur_lines = []
        else:
            cur_lines.append(line)
    if cur_type is not None:
        segments.append((cur_type, "\n".join(cur_lines)))
    return segments


def parse_system(text):
    fields = {}
    for line in text.strip().split("\n"):
        if ":" in line:
            k, _, v = line.partition(":")
            fields[k.strip()] = v.strip()
    return fields


def summary_for(content, assistant_bodies):
    """Return the summary for an assistant turn, or None if empty.

    Raises on any ambiguous/missing anchor so misalignment fails loudly.
    """
    text = content.strip()
    if not text:
        return ""  # empty turn
    if text.startswith(SESSION_LIMIT_PREFIX):
        return SESSION_LIMIT_SUMMARY
    matches = [s for (anchor, s) in SUMMARIES if anchor in text]
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise SystemExit(
            f"NO anchor matched an assistant turn starting:\n  {text[:160]!r}"
        )
    raise SystemExit(
        f"MULTIPLE anchors matched one turn starting:\n  {text[:160]!r}"
    )


def main():
    with open(SRC, encoding="utf-8") as f:
        raw = f.read()

    segments = parse_segments(raw)
    assistant_bodies = [c for (t, c) in segments if t == "assistant"]

    # Verify each anchor matches exactly one assistant turn (catches dup/stale anchors).
    for anchor, _ in SUMMARIES:
        n = sum(1 for c in assistant_bodies if anchor in c)
        if n != 1:
            raise SystemExit(f"Anchor matched {n} turns (expected 1): {anchor!r}")

    parts = []
    empty_count = 0
    limit_count = 0
    for seg_type, content in segments:
        if seg_type == "system":
            f = parse_system(content)
            title = f.get("Slug", "session")
            meta_bits = []
            if f.get("Date"):
                meta_bits.append(f"<span>{html.escape(f['Date'])}</span>")
            if f.get("Project"):
                meta_bits.append(f"<span>{html.escape(f['Project'])}</span>")
            if f.get("Session"):
                meta_bits.append(f"<span class='sid'>{html.escape(f['Session'])}</span>")
            parts.append(
                "<section class='session'>"
                f"<h2>{html.escape(title)}</h2>"
                f"<div class='session-meta'>{' · '.join(meta_bits)}</div>"
                "</section>"
            )
        elif seg_type == "user":
            body = render_md(content.strip())
            parts.append(
                "<div class='turn user'>"
                "<div class='role'>User</div>"
                f"<div class='content'>{body}</div>"
                "</div>"
            )
        elif seg_type == "assistant":
            summary = summary_for(content, assistant_bodies)
            text = content.strip()
            if summary == "":
                empty_count += 1
                parts.append(
                    "<div class='turn assistant'>"
                    "<div class='role'>Assistant</div>"
                    "<div class='content empty'><em>(No response was recorded for this turn.)</em></div>"
                    "</div>"
                )
                continue
            if summary == SESSION_LIMIT_SUMMARY:
                limit_count += 1
            body = render_md(text)
            parts.append(
                "<div class='turn assistant'>"
                "<div class='role'>Assistant</div>"
                "<details>"
                f"<summary>{html.escape(summary)}</summary>"
                f"<div class='content'>{body}</div>"
                "</details>"
                "</div>"
            )

    body_html = "\n".join(parts)
    doc = TEMPLATE.replace("{{BODY}}", body_html)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(doc)
    n_assistant = len(assistant_bodies)
    print(
        f"Wrote {OUT}: {len(segments)} segments, {n_assistant} assistant turns "
        f"({empty_count} empty, {limit_count} session-limit, "
        f"{n_assistant - empty_count - limit_count} summarized)."
    )


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Super Mermaid — Session Transcript</title>
<style>
  :root {
    --bg: #0f1117; --panel: #171a21; --user-bg: #1d2733; --border: #2a2f3a;
    --text: #d8dde6; --muted: #8b94a3; --accent: #6ea8fe; --code-bg: #0b0d12;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }
  .wrap { max-width: 860px; margin: 0 auto; padding: 2rem 1.25rem 6rem; }
  header.page { margin-bottom: 2rem; }
  header.page h1 { margin: 0 0 .25rem; font-size: 1.6rem; }
  header.page p { margin: 0; color: var(--muted); font-size: .9rem; }
  .controls { margin: 1rem 0 0; display: flex; gap: .5rem; }
  .controls button {
    background: var(--panel); color: var(--text); border: 1px solid var(--border);
    border-radius: 6px; padding: .4rem .8rem; cursor: pointer; font-size: .85rem;
  }
  .controls button:hover { border-color: var(--accent); }
  .session {
    margin: 2.5rem 0 1rem; padding: .75rem 1rem; border-left: 3px solid var(--accent);
    background: var(--panel); border-radius: 0 6px 6px 0;
  }
  .session h2 { margin: 0; font-size: 1.05rem; }
  .session-meta { color: var(--muted); font-size: .78rem; margin-top: .25rem; display: flex; flex-wrap: wrap; gap: .5rem; }
  .session-meta .sid { opacity: .6; }
  .turn { margin: 1rem 0; }
  .role { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: .3rem; }
  .turn.user .content {
    background: var(--user-bg); border: 1px solid var(--border);
    border-radius: 8px; padding: .75rem 1rem;
  }
  .turn.assistant details {
    border: 1px solid var(--border); border-radius: 8px; background: var(--panel);
  }
  .turn.assistant summary {
    cursor: pointer; padding: .75rem 1rem; color: var(--text); font-weight: 500;
    list-style: none; outline: none;
  }
  .turn.assistant summary::-webkit-details-marker { display: none; }
  .turn.assistant summary::before {
    content: "▸"; color: var(--accent); margin-right: .55rem; display: inline-block; transition: transform .15s;
  }
  .turn.assistant details[open] summary::before { transform: rotate(90deg); }
  .turn.assistant summary:hover { color: var(--accent); }
  .turn.assistant details .content {
    padding: 0 1rem 1rem; border-top: 1px solid var(--border); margin-top: 0;
  }
  .turn.assistant details .content > :first-child { margin-top: 1rem; }
  .content.empty { color: var(--muted); padding: .75rem 1rem; }
  .content :first-child { margin-top: 0; }
  .content :last-child { margin-bottom: 0; }
  pre {
    background: var(--code-bg); border: 1px solid var(--border); border-radius: 6px;
    padding: .75rem 1rem; overflow-x: auto; font-size: .82rem;
  }
  code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: .85em; }
  :not(pre) > code { background: var(--code-bg); padding: .1rem .35rem; border-radius: 4px; }
  table { border-collapse: collapse; margin: 1rem 0; width: 100%; }
  th, td { border: 1px solid var(--border); padding: .4rem .6rem; text-align: left; font-size: .88rem; }
  th { background: var(--panel); }
  a { color: var(--accent); }
  h1,h2,h3,h4 { line-height: 1.3; }
</style>
</head>
<body>
<div class="wrap">
  <header class="page">
    <h1>Super Mermaid — Session Transcript</h1>
    <p>User turns are shown in full. Assistant replies are collapsed to a two-sentence summary — click to expand.</p>
    <div class="controls">
      <button id="expand">Expand all</button>
      <button id="collapse">Collapse all</button>
    </div>
  </header>
{{BODY}}
</div>
<script>
  document.getElementById('expand').addEventListener('click', function () {
    document.querySelectorAll('details').forEach(function (d) { d.open = true; });
  });
  document.getElementById('collapse').addEventListener('click', function () {
    document.querySelectorAll('details').forEach(function (d) { d.open = false; });
  });
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
