# Girl Pikin For Betteh — Test Foundation Pack 01

## Goal

Add the first automated tests without touching Supabase or changing production business logic.

This pack focuses on the Vult webhook boundary used by voting and ticket payments.

## NEW files

Copy these files into the repository using the same paths:

- `vitest.config.ts`
- `tests/lib/vult/webhook.test.ts`

## PACKAGE CHANGE

Follow `PACKAGE_JSON_CHANGES.md`.

Install Vitest:

```bash
pnpm add -D vitest
```

Add these scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

## Verify

Run only this first critical test file:

```bash
pnpm exec vitest run tests/lib/vult/webhook.test.ts
```

Then run the complete test command:

```bash
pnpm test
```

Expected result: all webhook tests pass.

## What these tests protect

They verify that:

1. Only the exact configured Basic Auth credentials are accepted.
2. Missing or incorrectly formatted authorization is rejected.
3. Missing server webhook credentials fail closed.
4. Only `completed` and `failed` webhook statuses are accepted.
5. Missing order/request identifiers are rejected.
6. Unexpected/non-object payloads are rejected.

## No production changes

- No database migration.
- No environment variable values are included.
- No payment behavior is changed.
- No Vult API call is made by these tests.
- No production Supabase data is touched.

## Payment reporting rule retained

Reporting will continue to use exactly three customer-facing methods:

- `in-app` = Vult App
- `momo` = Mobile Money
- `card` = Card

Mobile Money is not split into Orange Money/Afrimoney.

## Next test pack

After this passes, the next testing work should cover settlement idempotency and database-backed
integrity flows in a non-production Supabase test environment:

- completed payment settles once,
- duplicate webhook does not duplicate votes/tickets,
- failed payment does not allocate votes/tickets,
- refunded vote creates the correct negative ledger entry,
- paid ticket order issues exactly the expected number of admissions,
- duplicate check-in cannot admit one ticket twice.
