# Phase 4 — Public Awards/Nominees + Admin Editing + Nominee Portal Linking

Phase 3 is live and deployed successfully. This phase moves the platform beyond
create-only administration.

## What this phase makes real

### Admin
- Edit category
- Activate/deactivate category
- Show/hide category publicly
- Edit nominee
- Publish nominee
- Archive nominee
- Nominee vote totals continue to come from the vote ledger
- Link an existing Supabase Auth user to a nominee
- Automatically assign the `nominee` role when linked
- Unlink a nominee account
- Audit log entries for category/nominee create/update/status/link actions

### Public
- `/awards` reads Supabase
- `/awards/[slug]` reads the real public edition, event, nominees and ticket tiers
- `/nominees` becomes a real searchable/filterable public directory
- `/nominees/[code]` becomes a real public nominee profile
- Draft/private nominees do not appear publicly because a true anonymous
  Supabase client is used for these pages

### Nominee portal
- `/nominee` reads the nominee linked to the logged-in Auth user
- Shows live vote total
- Shows rank when the leaderboard is visible
- Shows real nominee/category/edition/event information
- If the account is not linked, the portal clearly says so instead of showing a demo nominee

## 1. Run one new migration

In the correct Supabase SQL Editor run:

`supabase/migrations/0004_nominee_portal_access.sql`

This allows nominees to read the edition/category attached to their own nominee
record.

## 2. Correct the repo seed source file

Your current database is already correct.

However, the GitHub `supabase/seed.sql` still contains the old untyped UNION
values that previously failed. Replace it with the corrected `supabase/seed.sql`
included in this package.

DO NOT rerun seed.sql on the current database just for this cleanup.

## 3. Add files

- `lib/supabase/public.ts`
- `lib/public/live-awards-data.ts`
- `lib/admin/phase4-data.ts`
- `lib/nominee/live-data.ts`
- `components/portal/awards-management-live.tsx`
- `components/portal/nominee-dashboard-live.tsx`
- `components/public/live-awards.tsx`

## 4. Replace files

- `lib/admin/actions.ts`
- `app/admin/awards/categories/page.tsx`
- `app/admin/awards/nominees/page.tsx`
- `app/awards/page.tsx`
- `app/awards/[slug]/page.tsx`
- `app/nominees/page.tsx`
- `app/nominees/[code]/page.tsx`
- `app/nominee/page.tsx`
- `supabase/seed.sql`

## 5. CSS

Append `PHASE4_CSS.txt` to `app/globals.css`.

## 6. No new Vercel variables

This phase reuses:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

## 7. Test order

1. Log in as Super Admin.
2. Go to Awards -> Categories.
3. Create/edit an official category.
4. Go to Awards -> Nominees.
5. Add a real nominee.
6. Publish the nominee.
7. Open `/nominees` in an incognito window.
8. Confirm only published/public nominees appear.
9. Open `/nominees/{CODE}`.
10. In Supabase Auth, create the nominee's login if it does not exist.
11. In Admin -> Nominees -> Manage, link the Auth email.
12. Sign in as that nominee and open `/nominee`.

Expected nominee portal:
- correct name/code/institution/category
- live vote total (initially 0)
- current rank if leaderboard is visible
- real 2026 edition/event details

## Important

The current 2026 seed says the voting window is closed. Therefore the new
public nominee/award pages correctly show "Voting is closed" instead of sending
real nominees into the still-preview voting checkout.

That voting checkout becomes the next phase.

## Still preview after Phase 4

- Homepage featured nominee/program sections
- Vote checkout/payment
- Events ticket checkout/payment
- Scanner
- Finance
- Users & Roles admin
- CMS/News/Programs
- Nominee portal sub-pages other than the dashboard

## Next phase

Phase 5 should be:

**Voting engine + configurable vote price + server-side vote order creation +
Vult payment initiation + webhook verification + vote ledger allocation.**
