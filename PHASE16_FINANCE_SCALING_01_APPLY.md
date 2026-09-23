# Girl Pikin For Betteh — Phase 16 Finance Scaling 01

## What this pack fixes

This pack removes the row-cap problem from the main Finance reporting surfaces.

It changes:

1. **Finance Overview**
   - exact successful/pending/failed counts from PostgreSQL
   - exact stale-payment and unresolved-webhook counts
   - exact successful volume by currency
   - new successful-payment breakdown by payment method

2. **Finance Payments**
   - server-side filtering
   - server-side search
   - 50-row pagination
   - exact result count
   - payment-method filter

3. **Finance Reports**
   - PostgreSQL aggregate totals instead of loading all rows into Next.js
   - exact gross/refund/net figures for the selected period
   - collection breakdown by payment type
   - collection breakdown by payment method

4. **CSV exports**
   - reads all matching rows in safe 1,000-row pages instead of relying on one Data API response
   - payments CSV now includes `Payment Method`

## Payment-method rule

Reporting remains exactly:

- `in-app` → **Vult App**
- `momo` → **Mobile Money**
- `card` → **Card**

Any missing/unexpected historical value is displayed as **Unknown**.

**Do not split Mobile Money into Orange Money/Afrimoney.** The current Vult data does not reliably identify the network.

## Files in this pack

- `SUPABASE_MIGRATION_BODY.sql`
- `apply_phase16_finance_scaling.py`

## Before applying

Use the connected development account/repository and a preview/staging environment first.

Confirm the repository still matches the version audited for this pack (main commit around `6e8571b` / September 18, 2026). If the Finance files have materially changed since then, review the patch before running it.

## Step 1 — apply the code patch

From the repository root, copy `apply_phase16_finance_scaling.py` into the repo temporarily and run:

```bash
python apply_phase16_finance_scaling.py
```

The script modifies:

- `lib/finance/data.ts`
- `app/admin/finance/payments/page.tsx`
- `components/portal/finance-live.tsx`
- `lib/finance/refund-report-data.ts`
- `components/portal/finance-refunds-reports.tsx`
- `app/api/admin/finance/export/route.ts`

After it succeeds, the patch script itself does not need to be committed.

## Step 2 — create the Supabase migration correctly

Do not invent a migration filename manually.

Check the CLI first:

```bash
supabase --version
supabase migration --help
```

Then create the migration:

```bash
supabase migration new finance_reporting_scaling
```

Copy the full contents of `SUPABASE_MIGRATION_BODY.sql` into the migration file created by the CLI.

The migration creates four **server-only SECURITY INVOKER RPCs** and supporting indexes. It explicitly revokes RPC execution from `PUBLIC`, `anon`, and `authenticated`, and grants execution only to `service_role`.

This matches the existing app architecture because `createAdminClient()` uses the server secret key; public/nominee clients do not call these finance RPCs.

## Step 3 — apply to preview/staging database

Use the project's established Supabase migration workflow.

Before applying, discover the current CLI command/flags rather than guessing:

```bash
supabase db --help
supabase db push --help
```

Apply the migration only to the intended Girl Pikin For Betteh preview/staging database.

## Step 4 — verify the database RPCs

Using the server/service-role context in the connected account, verify:

- `finance_overview_summary()` returns one row
- `finance_payment_filter_options()` returns providers
- `finance_payments_page(...)` returns payment rows plus `total_count`
- `finance_report_summary(...)` returns one row

Also confirm anon/authenticated users cannot directly execute these finance RPCs.

## Step 5 — verify the app

Run the project's available checks. If the earlier test-foundation pack was applied:

```bash
pnpm test
```

Also run the project's normal build/preview validation.

Manually verify:

### Finance Overview

- counts match database records beyond 500 rows
- Successful volume is correct
- Payment Methods displays:
  - Vult App
  - Mobile Money
  - Card
- unexpected/missing legacy method values display as Unknown

### Finance → Payments

- search works across order/payment/reference/payer fields
- Type filter works
- Status filter works
- Provider filter works
- Payment Method filter works
- Previous/Next pagination works
- result count reflects the whole filtered result set, not just the current page

### Finance → Reports

- date range works
- gross/refunds/net are correct
- Collections by Type is correct
- Collections by Payment Method is correct
- a refund processed during the selected period is counted even if its original payment happened before the period

### CSV

Export payments and confirm the CSV includes a **Payment Method** column containing only:

- Vult App
- Mobile Money
- Card
- Unknown

## Important scope note

This pack intentionally does **not** yet rewrite:

- Finance Reconciliation's current derived scan
- Refund Management's current payment/refund selector limits

Those two areas need their own database-side queries so we do not fix them by simply loading more rows into application memory.

That is the next Finance Scaling pack.
