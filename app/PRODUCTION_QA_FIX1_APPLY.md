# Production QA Fix 1 — Active Demo Route Removal + Individual Tickets

This package is intentionally small. Apply it directly to the current `main`
branch and let the connected Vercel project build/deploy it.

## What this fixes

### 1. `/vote` no longer opens the old mock-data voting screen

The current public header sends users to `/vote`, but that route still imports
the old `components/voting/voting.tsx` preview component backed by
`lib/mock-data.ts`.

This package changes `/vote` to redirect to `/nominees`.

The live nominee directory then leads to the existing live routes:

- `/vote/[code]`
- `/vote/[code]/checkout`

No voting/payment implementation is replaced.

### 2. `/admin/events/tickets` becomes live

The current route still renders `AdminModule`, which is backed by the old
generic demo configuration.

This package replaces it with a real Individual Tickets workspace backed by:

- `tickets`
- `ticket_orders`
- `ticket_order_items`
- `events`
- `ticket_checkins`

The page intentionally does NOT select or display `qr_token_hash`.

It shows one row per issued admission with:

- ticket code
- event
- ticket tier
- parent order
- optional holder name
- ticket status
- admission sequence
- check-in state/time
- issued time

Existing RLS continues to control which event tickets a staff user can see.

### 3. `/tickets` is no longer hardcoded to the 2026 ceremony slug

The current route redirects to `/events/50misa-2026/tickets`.

This package changes the generic `/tickets` route to `/events`, so the platform
does not hardcode one event as the permanent ticket destination.

## Files

Add:

- `lib/ticketing/admin-tickets-data.ts`
- `components/portal/individual-tickets-live.tsx`

Replace:

- `app/admin/events/tickets/page.tsx`
- `app/vote/page.tsx`
- `app/tickets/page.tsx`

## Database

No new migration is required.

This page uses tables and RLS already created in existing ticketing/check-in
migrations.

## Deploy sequence

1. Copy the five files into the repo at the exact paths above.
2. Commit to `main`.
3. Wait for Vercel deployment status to become green.
4. Test:
   - `/vote` -> should redirect to `/nominees`
   - click a real nominee and verify the existing live voting flow still works
   - `/tickets` -> should redirect to `/events`
   - `/admin/events/tickets` -> should show live individual tickets
   - filter tickets by event/status
   - verify a checked-in ticket shows its check-in time
   - verify no QR token/hash appears in the UI

## Do NOT delete the legacy files in this same commit

After this deploy is green, we will do a separate dead-code cleanup. The likely
cleanup targets include:

- `components/portal/admin-module.tsx`
- `components/portal/admin-pages.tsx`
- `components/voting/voting.tsx`
- `components/ticketing/ticketing.tsx`
- `components/public/content-pages.tsx`
- `components/portal/nominee-pages.tsx`
- `lib/mock-data.ts`
- `auth-wiring/`
- accidental duplicate `app/vote/vote/` route tree

Keeping deletion separate makes rollback much safer.
