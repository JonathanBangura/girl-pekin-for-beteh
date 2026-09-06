# Apply checklist

## Safe to add now
- `supabase/migrations/*`
- `supabase/seed.sql`
- `.env.example`

These files are not imported by the current Next.js app and should not affect
the existing live design.

## Do not wire auth into production yet unless both are true
1. The correct Supabase project exists.
2. The correct Vercel project has the Supabase environment variables.

Then install:

`pnpm add @supabase/supabase-js@2.115.0 @supabase/ssr@0.12.6`

and copy the `auth-wiring` files into the repository.

## After the migrations run
Generate database TypeScript types from the real Supabase project and commit
them as `lib/supabase/database.types.ts`. Do not hand-maintain generated types.
