@AGENTS.md

## Verification

- `npx tsc --noEmit` — type check
- `npm run build` — full production build
- `npx next lint` — ESLint

## Supabase

- No auth — rooms are accessed via tokenized URLs
- User identity (name, color) stored in browser localStorage
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Migration SQL in `supabase/migrations/` — must be applied manually to the Supabase project
