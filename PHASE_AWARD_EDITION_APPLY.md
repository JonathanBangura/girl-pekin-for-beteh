# Award + Edition Administration Phase

This phase completes the administrative chain:

Award -> Edition -> Category -> Nominee -> Voting

It deliberately does not implement Results publication, Finance, Scanner or CMS
features. Those remain in their agreed later phases.

## Files

New:
- `supabase/migrations/0010_award_edition_management.sql`
- `lib/admin/award-edition-data.ts`
- `lib/admin/award-edition-actions.ts`
- `components/portal/award-edition-management.tsx`

Replace:
- `app/admin/awards/page.tsx`
- `app/admin/awards/editions/page.tsx`
- `lib/public/live-awards-data.ts`
- `lib/nominee/live-data.ts`

No npm package changes are required.

## Apply order

1. Run `supabase/migrations/0010_award_edition_management.sql` in the correct Supabase project.
2. Add/replace the code files above.
3. Commit and deploy.
4. Test desktop and mobile.

## What this phase adds

### Awards
- Create award
- Edit award
- Draft / Published / Archived states
- Prevent archiving an award while it still has non-archived editions
- Audit logging

### Editions
- Create edition under an award
- Edit edition
- Year and edition number
- Edition label
- Theme and description
- Public/private state
- Voting start/end
- Lifecycle status
- Leaderboard Hidden / Visible / Frozen
- Correct `leaderboard_frozen_at` behavior
- Explicit ceremony-event association
- Category and nominee counts
- Audit logging

### Results boundary

The Edition screen intentionally cannot manually move an edition into
`results_review` or `results_published`.

Those statuses remain owned by the later Results certification workflow:

Voting Close -> Freeze -> Reconcile -> Review -> Approve -> Publish

This keeps the system aligned with the agreed rule that a winner is not
automatically declared or manually published without certification.

## Ceremony event relationship

Migration 0010 adds:

`award_editions.ceremony_event_id`

The existing `events.award_edition_id` still remains.

This allows an edition to have multiple related events but identifies one event
as the official ceremony. The migration validates that the ceremony event belongs
to the same edition.

The public award pages and nominee dashboard now prefer the explicit ceremony
event and fall back to the earliest edition event for backwards compatibility.

## Existing 2026 edition test

Go to:

`/admin/awards/editions`

Confirm the existing `6th Edition · 2026` appears.

Edit it and verify:
- award is correct
- voting dates are correct
- public state is correct
- leaderboard state is correct
- ceremony event can be selected

## Voting lifecycle rule

Do not set `Voting Open` until:
- edition is Public
- voting start exists
- voting end exists
- voting end is later than voting start

The server action enforces these conditions.

## Mobile priority

The management screens reuse the existing mobile-first admin classes already
used in ticketing:
- `mobile-admin-page`
- `mobile-admin-stats`
- `mobile-admin-form`
- `mobile-table-wrap`
- `mobile-row-editor`
- `mobile-row-form`

Test at approximately 360px, 390px and 430px widths after deployment.
