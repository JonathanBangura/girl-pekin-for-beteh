# Phase 5A — Real Voting Core (Provider-Safe)

## Phase 4 check

The latest Phase 4 commit is deployed successfully on Vercel.

The Phase 4 public Awards/Nominees and nominee-portal files are present in the
current repository.

One source-of-truth cleanup is still outstanding:
`supabase/seed.sql` in GitHub still contains the old untyped UNION values that
previously failed. This package includes the corrected seed.

Replace the repository copy only. Do NOT rerun seed.sql on the existing
Supabase database.

## What Phase 5A makes real

- configurable price per vote
- configurable currency
- minimum / maximum vote quantities
- configurable quick vote quantities
- live Admin -> Awards -> Voting page
- public vote screen uses the real published nominee
- server validates the nominee, edition status, voting dates, quantity and price
- real `vote_orders` are created
- real pending `payments` are created with provider = `vult`
- public order status uses an opaque UUID token
- pending orders allocate zero votes
- service-role-only settlement RPC is prepared for a verified provider webhook
- successful settlement inserts the append-only vote ledger only once

## Important Vult boundary

Vult's public site advertises REST APIs, merchant checkout, webhooks and payment
collection, but the exact payment initiation/authentication/webhook signature
contract is not publicly available there yet.

This package therefore does NOT invent a Vult endpoint, payload or signature
scheme.

The safe lifecycle is now:

order
-> pending payment
-> verified Vult callback/webhook (Phase 5B)
-> `settle_vote_payment_success(...)`
-> vote ledger

## 1. Run migration

Run only:

`supabase/migrations/0005_voting_core.sql`

in the correct Supabase project.

## 2. Correct the repo seed

Replace:

`supabase/seed.sql`

with the corrected file included here.

Do not rerun it on the current database.

## 3. Add files

- `lib/voting/live-data.ts`
- `lib/admin/voting-actions.ts`
- `components/portal/voting-management-live.tsx`
- `components/voting/live-voting.tsx`
- `components/voting/vote-quantity-selector.tsx`
- `components/voting/vote-checkout-form.tsx`
- `app/api/voting/orders/route.ts`
- `app/vote/order/[token]/page.tsx`

## 4. Replace route files

- `app/admin/awards/voting/page.tsx`
- `app/vote/page.tsx`
- `app/vote/[code]/page.tsx`
- `app/vote/[code]/checkout/page.tsx`

## 5. CSS

Append `PHASE5A_CSS.txt` to the bottom of `app/globals.css`.

## 6. Environment variables

No new variables are required for Phase 5A.

It reuses:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

## 7. Configure the official vote price

After deployment:

Admin -> Awards -> Voting

Enter the organization's actual approved:
- price per vote
- currency
- minimum votes
- maximum votes
- quick quantities

Do not use a guessed price.

## 8. Keep 2026 voting closed for now

The current edition is:
- status: `voting_closed`
- voting window: 20 June 2026 to 20 July 2026

Therefore the public vote page will correctly refuse to create an order.

Do not reopen voting just to test payments. First complete Phase 5B.

## What is needed for Phase 5B

Provide the current Vult merchant/payment API specification covering:

- payment initiation endpoint
- authentication method / required headers
- checkout request fields
- amount and currency units
- returned payment / redirect / QR / USSD fields
- callback or webhook payload
- callback/webhook authentication or signature verification
- provider status values
- status-query endpoint
- sandbox and production base URLs

Do NOT send private production secrets in chat. Put credentials directly in
Vercel environment variables when we know the required variable names.

## Phase 5B will then

1. initiate Vult checkout
2. save provider session/transaction references
3. return the Vult payment action/redirect
4. verify callbacks securely
5. deduplicate provider events
6. call `settle_vote_payment_success(...)`
7. allocate votes exactly once
8. update order/payment statuses
9. show the final order result to the voter
