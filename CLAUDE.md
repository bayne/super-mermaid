@AGENTS.md

## Verification

- `bunx tsc --noEmit` — type check
- `bun run build` — full production build
- `bunx eslint .` — ESLint
- `bun test` — run tests
- `bun test:coverage` — run tests with coverage (90%+ threshold enforced)
- `make check` — runs all of the above

## Supabase

- No auth — rooms are accessed via tokenized URLs
- User identity (name, color) stored in browser localStorage
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Migration SQL in `supabase/migrations/` — must be applied manually to the Supabase project
- `bun run gen:types` regenerates `src/lib/database.types.ts` from local Supabase schema
- `make supabase-start` starts local Supabase stack (requires Docker)
