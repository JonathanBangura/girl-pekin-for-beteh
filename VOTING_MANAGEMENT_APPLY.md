# Voting Management Recovery / Testing UX

This package improves the existing Awards → Voting workspace without changing
the public voting security rules.

## What changes

1. `/admin/awards/voting` now supports `?edition=<uuid>`.
2. Staff can explicitly select the award edition they are configuring.
3. Pricing saves keep the selected edition instead of jumping back to the latest.
4. Vote-order counts and recent orders are scoped to the selected edition.
5. The page shows a clear readiness checklist:
   - edition public
   - status Voting Open
   - voting window configured
   - current time inside the voting window
   - pricing configured
   - pricing active
   - at least one published/public nominee
6. When all checks pass, the page exposes an `Open Test Nominee` link.
7. The obsolete message saying Vult payment initiation is disabled is removed.
8. No public vote guard is weakened.

## Files to replace

- `app/admin/awards/voting/page.tsx`
- `lib/voting/live-data.ts`
- `lib/admin/voting-actions.ts`
- `components/portal/voting-management-live.tsx`

## Database

No migration is required for this package.

Migrations `0020` and `0022` are already present on current `main`; keep them.

## Test sequence

After Vercel is green:

1. Open `/admin/awards/voting`.
2. Select the 6th Edition.
3. Set the approved vote price and save.
4. Go to Awards → Editions.
5. Make the edition public.
6. Set a temporary voting start/end window that includes the current time.
7. Set status to `Voting Open`.
8. Return to Awards → Voting.
9. Confirm all readiness checks show Ready.
10. Open the test nominee.
11. Submit a Vult Stage vote.
12. Complete payment.
13. Confirm the order becomes paid and the vote allocation appears.
14. Close the test voting window again after verification.
