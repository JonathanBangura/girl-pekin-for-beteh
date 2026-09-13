# Phase 7A — Finance Operations & Reconciliation

This phase follows the agreed roadmap after Phase 6C.

It replaces the demo Finance Overview, Payments and Reconciliation pages with
live operational data.

## Confirmed Phase 6C state before this phase

The latest repository build is green after the Phase 6C repair. The scanner
dependency, restored ticket-orders page, CSS and scanner hardening migration are
present.

## Files to add

- `lib/finance/data.ts`
- `lib/finance/actions.ts`
- `components/portal/finance-live.tsx`

## Files to replace

- `app/admin/finance/page.tsx`
- `app/admin/finance/payments/page.tsx`
- `app/admin/finance/reconciliation/page.tsx`

## Database changes

None.

This phase intentionally uses the existing:

- `payments`
- `payment_events`
- `vote_orders`
- `vote_ledger`
- `ticket_orders`
- `ticket_order_items`
- `tickets`
- `refunds`
- `audit_logs`

No new migration is required.

## What becomes live

### Finance Overview

Shows:

- successful payment count
- pending / processing count
- failed count
- unresolved provider-event count
- stale pending count
- successful volume by currency
- recent payments

### Payments

Provides real filters for:

- order/payment/provider reference search
- payment type
- payment status
- provider

It displays payment and linked order state together so Finance can see when the
provider/payment state and operational order state disagree.

### Reconciliation

Automatically derives cases for:

- completed Vult webhook that was not processed cleanly
- successful vote payment whose order or vote ledger is incomplete
- successful ticket payment whose order is not paid
- paid ticket order with missing individual QR tickets
- ticket email delivery failure
- payments pending/processing for more than 30 minutes

## Safe recovery actions

There are only two mutation actions.

### Reprocess event

Available only for an already-received Vult `completed` event.

It reuses the saved provider event and existing idempotent settlement functions.
It does NOT call Vult to charge the customer again.

### Repair settlement

Available only when `payments.status = succeeded`.

It can repair:

- vote-order paid state
- missing vote-ledger allocation
- ticket-order paid state
- missing individual ticket issuance
- ticket email delivery

It does NOT change a pending payment to successful and does NOT create a new
provider transaction.

Every successful recovery is written to `audit_logs`.

## Important boundary

Refund processing is NOT implemented in Phase 7A.

The current database has a `refunds` table, but this code does not pretend a
provider refund endpoint exists. Refunds and reversals should be implemented
only against the actual supported provider workflow.

Finance Reports also remain for the next finance subphase.

## Apply

1. Add the 3 new files.
2. Replace the 3 page files.
3. Commit and deploy.
4. Confirm Vercel build is green.
5. Open:
   - `/admin/finance`
   - `/admin/finance/payments`
   - `/admin/finance/reconciliation`
6. Run `CHECK_PHASE7A_FINANCE.sql` in the correct Supabase project.
7. If Reconciliation shows a real exception, test recovery only on a known test
   transaction first.

No npm package, CSS or environment-variable changes are required.

## Next after Phase 7A

Once the live Finance pages are verified:

Phase 7B:
- refund/reversal workflow based on supported Vult capability
- finance exports/reports
- payment and reconciliation CSV export

Then move to Results Certification.
