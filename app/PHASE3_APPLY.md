# Phase 3 — Live Admin Dashboard + Awards/Categories/Nominees

This phase replaces the most important admin demo data with real Supabase data.

## Live after this phase

- `/admin`
- `/admin/awards`
- `/admin/awards/editions`
- `/admin/awards/categories`
- `/admin/awards/nominees`

Categories and nominees also get real create forms.

Other admin sections remain on their current preview components for now.

## Important source-of-truth cleanup

The repository still contains the original versions of:

- `supabase/migrations/0003_payments_voting_ticketing.sql`
- `supabase/seed.sql`

Those are the versions that previously failed in Supabase SQL Editor. This
package includes the corrected versions that were run successfully.

Replace the repository versions with the corrected copies in this package.
You do NOT need to rerun them on the current Supabase database.

## Files to add

- `lib/supabase/admin.ts`
- `lib/admin/live-data.ts`
- `lib/admin/actions.ts`
- `components/portal/admin-dashboard-live.tsx`
- `components/portal/awards-live.tsx`

## Route files to replace

- `app/admin/page.tsx`
- `app/admin/awards/page.tsx`
- `app/admin/awards/editions/page.tsx`
- `app/admin/awards/categories/page.tsx`
- `app/admin/awards/nominees/page.tsx`

## CSS

Append `PHASE3_CSS.txt` to the bottom of `app/globals.css`.

## Vercel environment variable

The live reads use the signed-in user's Supabase session and RLS.

Creating categories and nominees is server-only and requires:

`SUPABASE_SECRET_KEY=sb_secret_...`

Add the secret from the CORRECT Supabase project to the CORRECT Vercel project.
Never prefix this variable with `NEXT_PUBLIC_`.

Redeploy after adding it.

## Expected result

The admin dashboard will show real values:
- 2026 / 6th Edition
- 0 published nominees until you publish real nominees
- 0 vote orders until voting begins
- 0 ticket orders until ticket sales begin
- no fake recent activity

Awards will show the real seeded award and edition.

Categories will initially be empty because we intentionally did not invent
official categories. You can create the real categories in the admin.

Nominees will initially be empty. After a category exists, you can add real
nominees. Vote totals are calculated from the vote ledger.

## Security

Create actions:
1. verify the signed-in session,
2. require `awards.manage`,
3. use the server-only Supabase secret,
4. write the real user's id into `created_by`,
5. revalidate the affected admin pages.

Direct browser INSERT/UPDATE access remains disabled.

## Next slice after Phase 3

- edit/publish/archive category and nominee controls
- public award + nominee data from Supabase
- nominee Auth-user linking
- live nominee portal
- voting checkout + Vult payment integration
