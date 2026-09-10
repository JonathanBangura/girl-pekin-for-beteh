# Vult Merchant Payment Integration

This package implements the Vult API supplied in `Vult Merchant API(1).zip`
for both public voting and paid event ticket orders.

## What the supplied Vult documentation says

Payment link endpoint:

- STAGE: `POST https://stage.vultme.io/api/merchants/private/v1/payment-links`
- PROD: `POST https://wallet.vultme.io/api/merchants/private/v1/payment-links`

Request body:

```json
{
  "merchantId": "YOUR_MERCHANT_ID",
  "type": "in-app",
  "payload": {
    "orderId": "YOUR-ORDER-ID",
    "amount": "10",
    "currency": "SLE"
  }
}
```

The request must include:

`X-Vult-Merchant-Signature`

The supplied JavaScript example signs the exact JSON body using:

- RSA-4096 private key
- SHA-512
- RSA PSS padding
- PSS salt length equal to digest length
- Base64 output

Vult payment methods in the supplied OpenAPI:

- `card`
- `in-app`
- `momo`

The supplied JavaScript signature example uses `"type": "vult"` instead of
`"in-app"`. This package does not hide that inconsistency. It uses
`VULT_IN_APP_TYPE=in-app` by default and lets you change it to `vult` if Vult
confirms the merchant environment expects that value.

Webhook:

Vult POSTs:

```json
{
  "orderId": "order-123",
  "vultRequestId": "123456",
  "status": "completed"
}
```

Status values:

- `completed`
- `failed`

The supplied documentation says merchant webhook authentication is Basic Auth.

It also explicitly says a `failed` webhook represents a failed customer payment
attempt and the merchant should KEEP THE ORDER PENDING because the customer can
retry later.

It says the Vult backend currently sends the webhook only once.

## Phase behavior

### Vote payment completed

`completed`:

1. webhook is persisted in `payment_events`
2. vote payment becomes `succeeded`
3. vote order becomes `paid`
4. `settle_vote_payment_success(...)` runs
5. vote ledger receives the quantity exactly once

### Vote payment failed

The order/payment remain pending/processing so the customer can retry, matching
the supplied Vult documentation.

### Ticket payment completed

For now:

1. webhook is persisted
2. ticket payment becomes `succeeded`
3. ticket order becomes `paid`
4. individual QR ticket issuance is intentionally deferred to Phase 6B

This avoids creating random one-time QR delivery tokens before the ticket
email/QR delivery workflow is ready.

Phase 6B will issue the individual QR tickets from the already-paid order.

## 1. Run migration

Run only:

`supabase/migrations/0007_vult_payment_gateway.sql`

Do not rerun older migrations.

## 2. Add new files

- `lib/vult/client.ts`
- `lib/vult/webhook.ts`
- `lib/vult/public.ts`
- `app/api/webhooks/vult/route.ts`
- `components/payments/vult-payment-method.tsx`
- `components/payments/payment-status-refresh.tsx`
- `components/payments/vult-payment-status.tsx`
- `app/payment/vult/[kind]/[token]/page.tsx`

## 3. Replace files

- `app/api/voting/orders/route.ts`
- `app/api/ticketing/orders/route.ts`
- `components/voting/vote-checkout-form.tsx`
- `components/ticketing/live-ticket-checkout-form.tsx`

## 4. CSS

Append:

`PHASE_VULT_CSS.txt`

to `app/globals.css`.

Mobile remains the acceptance priority.

## 5. Generate the RSA-4096 key pair

Do this locally on a secure machine, not in ChatGPT:

```bash
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:4096
openssl rsa -pubout -in private_key.pem -out public_key.pem
```

Create the Base64 public key for Vult staff:

macOS:

```bash
base64 < public_key.pem | tr -d '\n'
```

Linux:

```bash
base64 -w 0 public_key.pem
```

Create the private key value for Vercel:

macOS:

```bash
base64 < private_key.pem | tr -d '\n'
```

Linux:

```bash
base64 -w 0 private_key.pem
```

Never commit `private_key.pem`.

## 6. Give Vult staff

The supplied documentation says Vult staff need:

- Merchant name
- Webhook URL
- Webhook Basic Auth username/password
- RSA-4096 public key encoded in Base64

Use this webhook URL for the current deployment:

`https://girl-pekin-for-beteh.vercel.app/api/webhooks/vult`

Ask Vult staff to provide the real Merchant ID for this organization.

If card payments are needed, the supplied documentation says to request card
enablement from Vult staff.

## 7. Vercel environment variables

Add these to the correct Vercel project:

```text
VULT_ENV=stage
VULT_MERCHANT_ID=...
VULT_PRIVATE_KEY_BASE64=...
VULT_WEBHOOK_USERNAME=...
VULT_WEBHOOK_PASSWORD=...
VULT_IN_APP_TYPE=in-app
```

Do not use the Merchant ID shown in the supplied sample code unless Vult has
explicitly confirmed it belongs to this organization.

Do not expose any private key through `NEXT_PUBLIC_*`.

## 8. Stage first

Keep:

`VULT_ENV=stage`

until payment creation and webhooks have been confirmed.

The code uses:

`https://stage.vultme.io/api`

for stage and:

`https://wallet.vultme.io/api`

for prod.

## 9. In-app type discrepancy

The machine-readable OpenAPI lists:

`in-app`

The supplied JavaScript example signs:

`vult`

Start with:

`VULT_IN_APP_TYPE=in-app`

If stage returns `INVALID_FIELD` specifically for the payment type, confirm with
Vult staff and then change:

`VULT_IN_APP_TYPE=vult`

No code change is needed.

## 10. Testing

Ticketing is the easiest current stage test because the 2026 voting edition is
still closed.

Test:

1. `/events/50misa-2026/tickets`
2. choose a tier
3. continue to checkout
4. choose Vult App, Card or Mobile Money
5. submit purchaser details
6. application creates a real order
7. application requests a Vult payment link/code
8. user is sent to `/payment/vult/ticket/{token}`
9. Vult App/Card shows a "Continue to Vult" button
10. Mobile Money shows the USSD/payment code
11. page refreshes status every five seconds
12. Vult webhook `completed` changes payment and ticket order to paid

For a `failed` webhook, confirm the order remains open.

## 11. Webhook reliability

Because the supplied documentation says Vult sends the webhook only once, this
implementation stores the webhook in `payment_events` before settlement.

If downstream processing fails:

- the event remains saved
- `processing_error` is recorded
- `processed_at` stays null
- replaying the same webhook can retry processing even though its event ID is
  already present

This gives Finance/Reconciliation a recoverable event instead of losing the
single Vult notification.

## 12. Do not test production by manually marking orders paid

Use Vult stage and a real Vult stage webhook.

## Next: Phase 6B

After Vult stage payment completion is confirmed:

- issue individual tickets for already-paid orders
- generate QR presentation
- email tickets
- resend/reissue
- connect scanner validation and atomic check-in
