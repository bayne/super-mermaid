@AGENTS.md

## Verification

- `bunx tsc --noEmit` — type check
- `bun run build` — full production build
- `bunx eslint .` — ESLint
- `bun test` — run tests
- `bun test:coverage` — run tests with coverage (90%+ threshold enforced)
- `make check` — runs all of the above

## Claude chat auth & models

- Three providers in `src/lib/claude-auth.ts`: `anthropic` (API key) and `bedrock` (AWS creds) call Anthropic/AWS **directly from the browser** (Anthropic via the `anthropic-dangerous-direct-browser-access` header); `subscription` (Claude.ai OAuth) goes through our own server routes — see below.
- Model selection is **decoupled** from auth: the user picks a logical model id (`MODELS`) stored separately under `super-mermaid-claude-model`, and `resolveModelId()` maps it to the provider-specific id at request time. Don't put a `model` field back into the auth configs.
- **Tool use / editor writes**: `streamChatMessage` runs a tool loop (bounded by `MAX_TOOL_ITERATIONS`), parsing `tool_use` blocks from the stream and feeding `tool_result` blocks back across all three providers. The only tool today is `update_editor`, defined in `src/hooks/use-chat-sync.ts`; its `onToolUse` handler calls `updateContent` (passed into `useChatSync` from `editor-client.tsx`) so the assistant rewrites the shared diagram instead of pasting code into chat. The tool — and the editor-aware variant of the system prompt — are only enabled when `onApplyDiagram` is supplied to the hook. The subscription proxy forwards `tools` only when present, so a tools-less request body stays `{ model, system, messages }`.
- **Subscription OAuth is split client/server because Anthropic's OAuth endpoints send no CORS headers** (the browser cannot call them):
  - `src/lib/claude-oauth.ts` (browser) only does PKCE + builds the authorize URL (`createAuthorization`). The pasted code is handed to `POST /api/claude/oauth`, which exchanges it server-side.
  - Tokens live **only in an httpOnly cookie** set by `src/lib/claude-oauth-server.ts` — never in `localStorage`. The client `SubscriptionAuth` is just a `{ provider, expiresAt }` marker.
  - Subscription chat is proxied through `POST /api/claude/messages`: it reads the cookie, refreshes the token when near expiry (re-setting the cookie via `Set-Cookie`), attaches the bearer + `anthropic-beta: oauth-2025-04-20`, and streams the SSE response back. No `anthropic-dangerous-direct-browser-access` is used for subscription.
  - Footgun: the Messages API only honors a subscription bearer when the system prompt's first block is exactly `CLI_SYSTEM_PREFIX` (in `src/app/api/claude/messages/route.ts`) — changing that string silently breaks subscription auth.
  - Footgun: tokens are stored base64-JSON in one cookie; a very large token pair could exceed the ~4KB cookie limit and be silently dropped by the browser.

## Editor settings (per-browser)

- `src/lib/editor-settings.ts` stores `{ vimMode, autocomplete }` under `super-mermaid-editor-settings` (localStorage, not shared between collaborators). State lives in `editor-client.tsx` and flows to `EditorPanel` as props.
- Vim mode adds `@replit/codemirror-vim`'s `vim()` extension, which **must be first** in the extensions array to take keymap precedence. Autocomplete adds `snippetCompletionExtension()` (`src/lib/snippet-completion.ts`), which feeds the existing `MERMAID_SNIPPETS` into `@codemirror/autocomplete` and binds **Tab** (via `Prec.highest`) to accept a *selected* completion or otherwise advance the inserted snippet's `${field}`s. `basicSetup.autocompletion` is disabled so there's only one completion config.
- Footgun: the `extensions` array and `basicSetup` object passed to `<CodeMirror>` in `EditorPanel` **must keep a stable identity across renders** (memoized / hoisted constant). `@uiw/react-codemirror` reconfigures the whole editor whenever either prop changes identity, and a reconfigure silently discards state added via `appendConfig` — including the active snippet field tracking. Since `content` is controlled, a fresh array/object would reconfigure on every keystroke and break Tab snippet-field navigation mid-edit.

## Supabase

- No auth — rooms are accessed via tokenized URLs
- User identity (name, color) stored in browser localStorage
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Migration SQL in `supabase/migrations/` — must be applied manually to the Supabase project
- `bun run gen:types` regenerates `src/lib/database.types.ts` from local Supabase schema
- `make supabase-start` starts local Supabase stack (requires Docker)
