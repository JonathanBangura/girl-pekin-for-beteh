# Phase 6B Closeout — Ticket Issuance, QR Wallet & Email

The current repo already contains the Phase 6B backend, wallet component,
Resend delivery, resend API, Vult webhook integration, QR dependency and CSS.

The missing route is:

`app/tickets/order/[token]/page.tsx`

Without it, the payment-success button and ticket email can point to a route
that does not exist.

## Apply

Add the route file from this package.

No SQL migration, npm dependency, CSS change or Vult code change is required.

## End-to-end acceptance test

Complete one real/stage Vult ticket payment.

Expected chain:

Payment -> succeeded
Ticket order -> paid
Webhook -> ticket issuance
One QR ticket per admission
Email attempt recorded
Payment page -> View My QR Tickets
/tickets/order/{public_token} -> ticket wallet

Run `CHECK_PHASE6B_TICKET_DELIVERY.sql` after the test.

The key acceptance result is:

`expected_ticket_count = issued_ticket_count`
`counts_match = true`

Required deployed environment:

- TICKET_QR_SECRET
- RESEND_API_KEY
- RESEND_FROM_EMAIL

After this passes, move to Phase 6C: real Scanner + Check-In.
