# Phase 7B — Refund/Reversal Register + Finance Reports/Exports

## Why this phase is designed this way

The supplied Vult merchant OpenAPI currently documents one merchant API path:

`POST /merchants/private/v1/payment-links`

The supplied specification does not document a merchant refund or reversal
endpoint.

Therefore this phase does NOT invent a Vult refund API and does NOT claim to
return money automatically.

Instead, the operational rule is:

1. Finance completes/confirms the real refund or reversal through the authorized
   external provider/support process.
2. Finance receives a genuine external/provider confirmation reference.
3. Finance records that already-completed money movement in the platform.
4. The platform atomically updates the payment/order/vote/ticket state and
   audit trail.

## Files

New:
- `supabase/migrations/0013_finance_refund_controls.sql`
- `lib/finance/refund-actions.ts`
- `lib/finance/refund-report-data.ts`
- `components/portal/finance-refunds-reports.tsx`
- `app/api/admin/finance/export/route.ts`

Replace:
- `app/admin/finance/refunds/page.tsx`
- `app/admin/finance/reports/page.tsx`

No npm package, CSS or environment-variable change is required.

## 1. Run migration

Run:

`supabase/migrations/0013_finance_refund_controls.sql`

in the correct Supabase project.

## 2. What the migration adds

It extends the existing `refunds` table with:

- `refund_kind` — refund or reversal
- `external_method`
- `notes`
- `completed_by`
- `provider_confirmed_at`

It also adds:

`record_external_full_refund(...)`

This function is transactional and finance-permission protected.

## 3. Full refunds only in this phase

Phase 7B intentionally supports FULL refunds/reversals only.

It does not attempt to infer a partial vote quantity or partial ticket selection
from an arbitrary money amount.

### Vote refund/reversal

The function:

- requires the payment to already be succeeded
- requires the vote order to already be paid
- requires the original positive vote-ledger allocation to exist
- records the completed external refund/reversal
- marks the payment refunded/reversed
- marks the vote order refunded
- appends a NEGATIVE refund/reversal ledger entry
- never edits the original vote-ledger row
- writes an audit log

### Ticket refund/reversal

The function:

- requires the payment to already be succeeded
- requires the ticket order to already be paid
- records the completed external refund/reversal
- marks the payment refunded/reversed
- marks the ticket order refunded
- marks issued tickets refunded so the scanner rejects them
- keeps historical check-in records intact
- writes an audit log

### Donation refund/reversal

The payment/refund/audit state is updated. There is no linked vote or ticket
order to invalidate.

## 4. Refund page

Open:

`/admin/finance/refunds`

The action is deliberately named:

`Record completed external refund/reversal`

It is not labelled `Refund now`.

Finance must provide:

- successful payment
- refund or reversal
- external method
- genuine provider/external confirmation reference
- reason
- optional notes
- explicit confirmation checkbox that the money already moved

## 5. Finance Reports

Open:

`/admin/finance/reports`

The page provides:

- optional date range
- gross settled collections
- successful refunds/reversals
- net collected by currency
- collections by payment type and currency
- payment CSV export
- refund CSV export

Exports require an authenticated user with `finance.manage`.

## 6. Apply sequence

1. Run `0013_finance_refund_controls.sql`.
2. Add the 5 new code files.
3. Replace the Refunds and Reports pages.
4. Commit and deploy.
5. Confirm Vercel build is green.
6. Open:
   - `/admin/finance/refunds`
   - `/admin/finance/reports`
7. Run `CHECK_PHASE7B_REFUNDS_REPORTS.sql`.
8. Test only with a known stage/test transaction first.

## 7. Critical test

For a test vote payment:

- confirm the payment is succeeded and the vote exists
- complete/confirm an external refund in the real test process
- record the refund in Finance
- payment should become refunded
- vote order should become refunded
- vote ledger should contain a negative refund entry
- nominee total should decrease by exactly the original order quantity

For a test ticket payment:

- complete/confirm the external refund
- record it
- payment/order should become refunded
- issued tickets should become refunded
- scanner must reject the ticket

## 8. Not implemented intentionally

- automatic Vult refund API call
- partial refunds
- partial ticket selection
- refund approval workflow with two-person approval

These should be added only when the provider and business process are confirmed.

## Next roadmap item

After Phase 7B is verified:

Results Certification

Voting Closed -> Freeze -> Reconcile -> Review -> Approve -> Publish
