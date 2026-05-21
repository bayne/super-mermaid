# Super Mermaid

Collaborative Mermaid.js diagram editor with realtime cursor tracking, presence, and live preview.

**Stack:** Next.js 16 (App Router) + Supabase (DB + Realtime) + Vercel + CodeMirror 6 + Mermaid.js

## Quick Start

```bash
make setup                  # Install dependencies
cp .env.local.example .env.local  # Add your Supabase credentials
make dev                    # Start dev server at http://localhost:3000
```

## Local Development with Supabase

Requires Docker for the local Supabase stack:

```bash
make supabase-start         # Start local Supabase (Postgres, Realtime, Studio)
make supabase-migrate       # Apply DB migrations
make gen-types              # Regenerate TypeScript types from schema
make dev                    # Start Next.js dev server
```

Supabase Studio is available at http://localhost:54323 when running locally.

## Commands

Run `make help` for all available commands. Key ones:

| Command | Description |
|---------|-------------|
| `make dev` | Start Next.js dev server |
| `make check` | Run all checks (lint, typecheck, test, build) |
| `make test` | Run tests |
| `make test-coverage` | Run tests with coverage report |
| `make supabase-start` | Start local Supabase stack |
| `make supabase-migrate` | Apply DB migrations |
| `make gen-types` | Regenerate DB types |
| `make vercel-deploy` | Deploy to Vercel preview |
| `make vercel-deploy-prod` | Deploy to Vercel production |

## Deployment

### Vercel + Supabase Integration

1. Push the repo to GitHub (`bayne/super-mermaid`)
2. Connect the repo in the [Vercel Dashboard](https://vercel.com/new)
3. Add the [Supabase Integration](https://vercel.com/integrations/supabase) in Vercel — this auto-populates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Apply the migration SQL from `supabase/migrations/001_initial_schema.sql` to your Supabase project
5. Push to `main` to trigger automatic deployment

### Manual Deploy

```bash
make vercel-env-pull        # Pull env vars from Vercel to .env.local
make vercel-deploy-prod     # Deploy to production
```

## Architecture

- **No auth** — rooms are accessed via tokenized URLs (nanoid)
- **User identity** stored in browser localStorage (name, cursor color)
- **Realtime** — Supabase Broadcast for content sync + cursor tracking, Presence for online users
- **Persistence** — Auto-saves to Supabase Postgres with 2s debounce
- **Analytics** — Vercel Analytics + Speed Insights (auto-active on Vercel)
