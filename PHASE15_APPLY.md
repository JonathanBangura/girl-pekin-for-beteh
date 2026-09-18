# Phase 15 — Event Access & Ticket Lifecycle Completion

Base inspected: current `main` after the successful Voting Management update.

This phase completes the remaining original V1 event-access workflows without
replacing the working paid Vult ticket flow.

## What Phase 15 adds

- Free Registration events:
  public registration, no payment, confirmed zero-value order, individual QR
  tickets, wallet/email, capacity limits and duplicate-contact protection.
- Invitation Only events:
  staff-created private invitation links, optional email delivery, claim flow,
  confirmed QR tickets, expiry and revoke-before-claim.
- Complimentary admissions:
  staff-issued zero-value admission with mandatory reason and audit trail.
- Ticket lifecycle:
  ticket search, cancel and secure reissue of unused tickets.
- Scanner compatibility:
  both paid and confirmed admissions are accepted, while active-ticket,
  event-scope and one-time-use checks remain unchanged.

Non-payment admissions do NOT create fake payment records.

## Apply order

1. In the correct Girl Pikin For Betteh Supabase project, run:

   `supabase/migrations/0023_event_access_ticket_lifecycle.sql`

2. Run:

   `CHECK_0023_EVENT_ACCESS_TICKETS.sql`

3. Copy the package files into GitHub, preserving exact paths.

4. Apply the guarded edits to existing large files:

   `python3 APPLY_PHASE15_PATCHES.py`

   If you only edit through GitHub web UI, use:
   `PHASE15_MANUAL_PATCHES.md`

5. Commit to `main` and let Vercel deploy.

6. Do not proceed to cleanup/type-hardening until the Phase 15 deployment is
   green and the acceptance tests below pass.

## Event configuration

### Free Registration
Set the event to:
- Access type: Free Registration
- Status: Published
- Public event: on

Create at least one Ticket Type:
- Pricing type: Free
- Active: on
- optional capacity
- optional max per order
- optional registration start/end

The public event page will expose `Register free`.

### Invitation Only
Set the event to:
- Access type: Invitation Only
- Status: Published

Create at least one active ticket/access tier. Then use:
`Admin → Events → Access & Guests`

The invitation UUID is the bearer credential. A public event listing is not
required for a private invitation claim to work.

### Complimentary
Use:
`Admin → Events → Access & Guests → Issue Complimentary Admission`

A reason is mandatory and is written into audit history.

## Acceptance tests

### Free registration
1. Use a safe test event.
2. Configure Free Registration + Published + Public.
3. Add an active Free ticket type.
4. Register with email.
5. Confirm ticket wallet opens immediately with active QR.
6. Scan once: CHECKED IN.
7. Scan again: ALREADY USED.
8. Repeat the same event/contact registration: duplicate blocked.

### Invitation
1. Configure a test event as Invitation Only + Published.
2. Create an invitation under Access & Guests.
3. Open the private claim link.
4. Claim it.
5. Confirm the QR wallet.
6. Reopen the claim link: it should return the existing claimed admission and
   not create a duplicate order.
7. Create another pending invite and revoke it; it must no longer be claimable.

### Complimentary
1. Issue a complimentary admission with a reason.
2. Search for the guest under Events → Tickets.
3. Confirm source = Complimentary.
4. Scan successfully.

### Cancel
1. Choose an unused active ticket.
2. Cancel it with a reason.
3. Scanner should reject it as CANCELLED.

### Reissue
1. Choose another unused active ticket.
2. Reissue it with a reason.
3. The old QR/code must return REPLACED TICKET.
4. The new QR/code must check in successfully.
5. The next scan of the new ticket must return ALREADY USED.
6. If the order has an email, the replacement ticket email should be attempted.

### Paid-ticket regression
After Phase 15, repeat one Vult Stage paid ticket purchase:
payment → webhook → ticket issuance → email/wallet → scanner.

This proves confirmed-order support did not regress the already-working paid
ticket path.

## Important operational notes

- Open / No Registration events remain intentionally ticketless.
- Checked-in tickets cannot be cancelled or reissued.
- Reissue creates a new ticket ID, ticket code and QR token and marks the old
  ticket `reissued`.
- Complimentary, free-registration and invitation admissions use order status
  `confirmed`, source metadata and zero value.
- Paid tickets continue to use order status `paid` and successful Vult payment.
- Capacity calculations now include confirmed non-payment admissions.

## Files

New public access:
- `lib/ticketing/access-data.ts`
- `components/ticketing/free-registration-form.tsx`
- `components/ticketing/invitation-claim-form.tsx`
- `components/ticketing/event-access-public.tsx`
- `app/events/[slug]/register/page.tsx`
- `app/events/[slug]/invite/[token]/page.tsx`
- `app/api/events/register/route.ts`
- `app/api/events/invitations/claim/route.ts`

New admin access:
- `lib/ticketing/access-admin-data.ts`
- `lib/admin/event-access-actions.ts`
- `components/portal/event-access-management.tsx`
- `app/admin/events/access/page.tsx`
- `lib/admin/ticket-lifecycle-actions.ts`

Replacements:
- `lib/ticketing/ticket-issuance.ts`
- `lib/ticketing/ticket-email.ts`
- `lib/ticketing/ticket-wallet.ts`
- `components/ticketing/ticket-wallet.tsx`
- `lib/ticketing/admin-tickets-data.ts`
- `components/portal/individual-tickets-live.tsx`
- `app/admin/events/tickets/page.tsx`

Database:
- `supabase/migrations/0023_event_access_ticket_lifecycle.sql`
- `CHECK_0023_EVENT_ACCESS_TICKETS.sql`

Guarded existing-file edits:
- `components/portal/portal.tsx`
- `components/portal/event-management-live.tsx`
- `components/ticketing/live-ticketing.tsx`
