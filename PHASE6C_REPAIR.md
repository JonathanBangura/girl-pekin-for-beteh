# Phase 6C Repair — audited against current main

Do not start Finance yet. The current Phase 6C commit has several concrete
problems that should be repaired first.

## Confirmed issues

### 1. Missing scanner dependency

`components/scanner/scanner.tsx` imports `@zxing/browser`, but the current
`package.json` does not declare it. This is a build blocker.

Run from the repository root:

```bash
pnpm add @zxing/browser@0.2.1
```

Commit BOTH `package.json` and `pnpm-lock.yaml`.

### 2. Ticket Orders admin page was accidentally deleted

Restore:

`app/admin/events/orders/page.tsx`

using the file in this repair package.

### 3. Phase 6C CSS was not added to app/globals.css

Append the full contents of:

`PHASE6C_SCANNER_CSS.txt`

to `app/globals.css`.

### 4. Security hardening is required

The original ticketing migration grants authenticated users direct INSERT on
`ticket_checkins`. That means an authenticated check-in user could bypass the
new validation RPC and insert a check-in directly.

Run:

`supabase/migrations/0012_scanner_checkin_hardening.sql`

This:

- removes the direct authenticated INSERT path
- forces check-in through `check_in_ticket(...)`
- keeps the atomic duplicate protection
- prevents an event-scoped scanner from receiving guest/order data when a QR
  belongs to a different event

Do NOT edit/re-run the already committed 0011 migration in production; use the
new 0012 follow-up migration.

## Verified Phase 6C files already present in current main

- `supabase/migrations/0011_scanner_checkin.sql`
- `lib/checkin/data.ts`
- `app/api/checkin/route.ts`
- `app/api/checkin/summary/route.ts`
- `components/scanner/scanner.tsx`
- `components/portal/checkins-live.tsx`
- `app/scan/page.tsx`
- `app/scan/layout.tsx`
- `app/admin/events/checkins/page.tsx`

So these files do NOT need to be recreated.

## Apply order

1. `pnpm add @zxing/browser@0.2.1`
2. Restore `app/admin/events/orders/page.tsx`
3. Append `PHASE6C_SCANNER_CSS.txt` to `app/globals.css`
4. Run `0012_scanner_checkin_hardening.sql`
5. Commit and deploy
6. Confirm Vercel build succeeds
7. Run `CHECK_PHASE6C_REPAIR.sql`
8. Then perform the real QR -> check-in -> duplicate rejection test

Do not move to the next phase until all eight steps pass.
