# Phase 6A — Mobile-First Event Ticketing Core

## Phase 5A check

The current Phase 5A code is present in GitHub and the latest Vercel deployment
is successful.

The previously incorrect `supabase/seed.sql` source file is also corrected in
the repository now.

No blocking Phase 5A code/deployment issue was found.

The remaining Phase 5B dependency is the exact Vult merchant/payment API
contract. We are not inventing provider endpoints or webhook verification.

While that provider contract is pending, Phase 6A continues with the independent
ticketing core.

## Mobile is now a primary acceptance target

This phase includes a dedicated mobile priority stylesheet.

Every new public/admin operational page should be checked at:

- 360 × 800
- 390 × 844
- 430 × 932
- 768 × 1024

The new mobile rules prioritize:

- one-column transaction flows
- one-column ticket cards on phones
- 48px+ primary touch controls
- 16px form inputs to avoid iOS Safari zoom
- full-width checkout actions
- smaller phone gutters
- safe-area bottom spacing
- single-column admin forms
- horizontally scrollable admin tables without page overflow
- mobile-safe row editors

See `MOBILE_QA_CHECKLIST.md`.

## What Phase 6A makes real

### Public Events

- `/events` reads published Supabase events
- `/events/[slug]` reads the real event
- real ticket types/pricing are displayed
- no `mock-data.ts` dependency for these pages

### Ticket selection

- `/events/[slug]/tickets` reads active ticket types from Supabase
- fixed-price ticket types
- donation-per-ticket ticket types
- configured minimum donation support
- quantity selection
- max-per-order support
- admissions-per-unit support
- total admissions shown clearly
- server revalidates every price/limit

### Ticket checkout

- `/events/[slug]/checkout`
- real purchaser contact form
- server-side capacity validation
- server-side sales-window validation
- server-side price validation
- real `ticket_orders`
- real `ticket_order_items`
- real pending Vult `payments`
- 30-minute pending order reservation
- opaque public order token

### Order status

- `/tickets/order/[token]`
- public token does not expose purchaser PII
- shows order/payment status
- shows quantity/admission count
- shows issued ticket count after settlement

### Admin Events

- `/admin/events` becomes live
- `/admin/events/ticket-types` becomes live
- `/admin/events/orders` becomes live
- create/edit ticket type
- fixed/donation/free configuration
- capacity
- max per order
- admissions per unit
- sales start/end
- active/inactive
- live ticket-order/payment table

### Successful payment foundation

`settle_ticket_payment_success(...)` is service-role only.

After a verified successful provider payment it:

1. validates payment amount/currency
2. marks payment succeeded
3. marks order paid
4. creates one individual ticket per admission
5. creates an opaque random QR token
6. stores only SHA-256 of the QR token
7. returns the raw QR token only during first issuance
8. prevents duplicate tickets with `(ticket_order_item_id, admission_sequence)`

Example:

2 ticket units × 3 admissions per unit = 6 unique individual tickets.

## Provider boundary

Like voting, Phase 6A intentionally stops before real Vult payment initiation.

Current safe flow:

ticket selection
-> server reservation
-> pending Vult payment
-> verified Vult webhook later
-> `settle_ticket_payment_success(...)`
-> individual QR tickets
-> email delivery later

Pending orders issue zero tickets.

## 1. Run migration

Run:

`supabase/migrations/0006_ticketing_core.sql`

in the correct Supabase SQL Editor.

Do not rerun earlier migrations.

## 2. Add files

- `lib/ticketing/live-data.ts`
- `lib/admin/ticketing-actions.ts`
- `components/ticketing/live-ticket-selector.tsx`
- `components/ticketing/live-ticket-checkout-form.tsx`
- `components/ticketing/live-ticketing.tsx`
- `components/portal/ticketing-management-live.tsx`
- `app/api/ticketing/orders/route.ts`
- `app/tickets/order/[token]/page.tsx`

## 3. Replace route files

- `app/events/page.tsx`
- `app/events/[slug]/page.tsx`
- `app/events/[slug]/tickets/page.tsx`
- `app/events/[slug]/checkout/page.tsx`
- `app/admin/events/page.tsx`
- `app/admin/events/ticket-types/page.tsx`
- `app/admin/events/orders/page.tsx`

## 4. CSS

Append:

`MOBILE_PRIORITY_AND_PHASE6A_CSS.txt`

to the bottom of `app/globals.css`.

This also strengthens the Phase 5A voting flow on phones.

## 5. Environment variables

No new environment variables are required.

This phase reuses:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

## 6. Test after deployment

### Desktop/admin

1. Open Admin -> Events.
2. Confirm the real 2026 ceremony appears.
3. Open Ticket Types.
4. Confirm Diploma / Degree / Masters / PhD appear from Supabase.
5. Edit one harmless field such as max-per-order and save.
6. Confirm the public ticket page reflects the saved setting.

### Public

1. Open `/events`.
2. Open `/events/50misa-2026`.
3. Open `/events/50misa-2026/tickets`.
4. Confirm fixed prices come from Supabase.
5. Confirm PhD uses donation per ticket.
6. Confirm quantity changes total admissions correctly.

### Mobile

Repeat the public flow at 360px, 390px and 430px.

The ticket tier list must be one column on small phones and the checkout button
must remain easy to tap.

## Important current behavior

Creating a real ticket order is technically enabled by Phase 6A, but the
application clearly says the Vult adapter is still pending.

A created order will remain:

- order = pending
- payment = pending
- issued tickets = 0

That is intentional and safe.

Do not manually mark production payments successful to simulate Vult.

## What remains after Phase 6A

### Phase 5B / 6B — shared Vult payment adapter

Once the exact Vult API contract is supplied, one payment adapter can service
both vote orders and ticket orders.

### Ticket delivery

After payment integration:
- generate QR images from returned opaque tokens
- email individual tickets
- resend/reissue workflow
- customer order confirmation

### Scanner

Then connect:
- camera QR scanning
- token hashing/validation
- event matching
- active/unused checks
- atomic check-in
- duplicate scan response

## Note on free registration

The database supports `free` ticket types, but Phase 6A deliberately keeps free
registration separate from paid ticket checkout.

Free registration will be implemented as a no-payment workflow instead of
pretending it is a successful payment.
