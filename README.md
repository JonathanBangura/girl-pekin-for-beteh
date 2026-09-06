# Girl Pikin For Betteh — Supabase Phase 1

This package is a **code-first backend foundation** prepared against the current
Next.js 16 application. It does not require access to the production Supabase
or Vercel accounts to design the schema.

## Why this is split in two parts

The current GitHub application does not yet depend on Supabase packages. To avoid
breaking the live frontend before the correct Supabase/Vercel accounts are ready:

1. `supabase/` can be added to the repository immediately. It is not imported by
   Next.js and will not change the current UI or runtime.
2. `auth-wiring/` is ready for the next step, but copy it into the app only after
   installing the Supabase packages and setting environment variables.

## Database migration order

Run these on a **new, standalone Supabase project**, in order:

1. `supabase/migrations/0001_auth_rbac.sql`
2. `supabase/migrations/0002_core_domain.sql`
3. `supabase/migrations/0003_payments_voting_ticketing.sql`
4. `supabase/seed.sql`

The seed creates only confirmed 2026 award/event information and ticket tiers.
It intentionally creates **no unverified award categories and no nominees**.

## What the schema establishes

### Identity and access
- Supabase Auth-backed profiles
- Roles and granular permissions
- Optional global or scoped roles
- Super Admin bootstrap helper
- RLS foundations
- Audit log table

### Awards
- Awards
- Award editions
- Categories
- Nominees
- Private nominee-document metadata
- Leaderboard visibility/freeze settings

### Events
- Events
- Configurable ticket types
- Fixed / donation / free pricing
- Donation price is modeled per ticket unit
- `admissions_per_unit` is explicit

### Voting and payments
- Central payment records
- Idempotency keys and provider-event deduplication
- Vote orders
- Append-only vote ledger
- No editable `total_votes` field
- Positive payment allocations and negative reversals/refunds
- Public aggregate function that exposes totals only, never voter PII

### Ticketing and check-in
- Ticket order vs individual ticket separation
- One individual ticket row per admission
- Opaque QR token **hash** stored in the database; raw token is not stored
- Single-use check-in record
- Reissue/cancel/refund states

## Install the application packages

When the correct project is ready:

```bash
pnpm add @supabase/supabase-js@2.115.0 @supabase/ssr@0.12.6
```

This updates both `package.json` and `pnpm-lock.yaml`.

Then copy:

- `auth-wiring/lib/supabase/*` -> `lib/supabase/*`
- `auth-wiring/lib/auth/authorization.ts` -> `lib/auth/authorization.ts`
- `auth-wiring/proxy.ts` -> project root `proxy.ts`

The proxy has a safe bypass when the Supabase environment variables are absent,
so the existing public frontend can remain available during staged setup.

## Environment variables

Copy the names from `.env.example` to the correct Vercel project's Production,
Preview and Development environments.

Use modern Supabase keys:
- `sb_publishable_...` in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `sb_secret_...` in `SUPABASE_SECRET_KEY`

Never expose the secret key to browser code.

## First Super Admin

After creating the first user in Supabase Auth, run from the SQL editor:

```sql
select public.bootstrap_super_admin('admin@example.com');
```

Replace the email with the real administrator email.

## What comes next

After this foundation is applied, the recommended next implementation slice is:

**Auth UI + route protection -> Admin Awards CRUD -> public awards/nominees from
Supabase -> Nominee portal ownership -> voting checkout/payment webhook ->
ticket issuance/QR -> scanner -> finance/reconciliation.**

## Important implementation rules

- Prices and vote quantities must be validated server-side.
- Do not trust client-calculated totals.
- Payment/provider callbacks must be idempotent.
- Do not directly edit nominee vote totals.
- Do not expose voter identity or payment details in nominee/public endpoints.
- Issue individual tickets per admission, not one QR per order.
- QR payloads should be random opaque tokens; store only their hash.
- Use the server-only Supabase secret key only after application-level
  authorization checks.
