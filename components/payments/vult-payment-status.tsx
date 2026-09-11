import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import QRCode from 'qrcode'
import {
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import {
  getPublicVultPaymentStatus,
  type PublicVultOrderKind,
} from '@/lib/vult/public'
import { PaymentStatusRefresh } from './payment-status-refresh'
import {
  CopyPaymentCode,
  DialPaymentCode,
  OpenVultPayment,
} from './vult-payment-actions'

function money(value: unknown, currency: string) {
  const amount = Number(value ?? 0)
  return `${currency === 'SLE' ? 'NLe' : currency} ${amount.toLocaleString()}`
}

function backHref(
  kind: PublicVultOrderKind,
  referenceCode?: string | null,
) {
  if (kind === 'vote') return '/nominees'
  return referenceCode ? `/events/${referenceCode}` : '/events'
}

export async function VultPaymentStatusPage({
  kind,
  token,
}: {
  kind: PublicVultOrderKind
  token: string
}) {
  const status = await getPublicVultPaymentStatus(kind, token)

  if (!status) notFound()

  const completed = status.payment_status === 'succeeded'
  const waiting =
    status.payment_status === 'processing' ||
    status.payment_status === 'pending'

  const method = status.payment_method || 'in-app'

  // Card users should never have to stop at an intermediate merchant page.
  // Send them directly to the card checkout URL Vult returned.
  if (
    !completed &&
    method === 'card' &&
    status.payment_link
  ) {
    redirect(status.payment_link)
  }

  let qrDataUrl: string | null = null

  if (
    !completed &&
    method === 'in-app' &&
    status.payment_link
  ) {
    qrDataUrl = await QRCode.toDataURL(status.payment_link, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 360,
    })
  }

  const returnHref = backHref(kind, status.reference_code)

  return (
    <main className="vult-pay-page">
      <PaymentStatusRefresh active={!completed} />

      <section className="vult-pay-shell">
        {completed ? (
          <>
            <div className="vult-pay-brand-card">
              <Image
                src="/LOGOvult-horizontal-DARK-BLUE.svg"
                alt="Vult"
                width={150}
                height={56}
              />
            </div>

            <span className="vult-pay-kicker">Payment confirmed</span>
            <h1>Payment Received</h1>

            <div className="vult-payment-success vult-pay-success-large">
              <CheckCircle2 size={25} />
              <div>
                <strong>{status.order_number}</strong>
                <p>
                  {kind === 'vote'
                    ? 'Your successful payment has been allocated to the nominee vote ledger.'
                    : Number(status.issued_tickets) > 0
                      ? `${status.issued_tickets} ticket${Number(status.issued_tickets) === 1 ? '' : 's'} issued.`
                      : 'Your ticket order is paid. Your individual QR tickets are being prepared.'}
                </p>
              </div>
            </div>

            <div className="vult-pay-summary">
              <span>Total paid</span>
              <strong>{money(status.total_amount, status.currency)}</strong>
            </div>

            <Link className="button vult-action-primary" href={returnHref}>
              {kind === 'vote' ? 'Back to Nominees' : 'Back to Event'}
            </Link>
          </>
        ) : method === 'momo' ? (
          <>
            <div className="vult-pay-brand-card vult-pay-brand-card-momo">
              <Image
                src="/momo.png"
                alt="Orange Money and Afrimoney"
                width={180}
                height={70}
              />
            </div>

            <span className="vult-pay-kicker">Secure payment</span>
            <h1>Mobile Money Payment</h1>
            <p className="vult-pay-subtitle">
              Dial the code below to complete your Orange Money or Afrimoney payment.
            </p>

            {status.payment_code ? (
              <>
                <div className="vult-ussd-code">
                  {status.payment_code}
                </div>

                <div className="vult-pay-actions">
                  <CopyPaymentCode code={status.payment_code} />
                  <DialPaymentCode code={status.payment_code} />
                </div>
              </>
            ) : (
              <div className="live-vult-note">
                <strong>Waiting for a payment code</strong>
                <p>
                  The page will refresh automatically while Vult prepares the
                  mobile-money instruction.
                </p>
              </div>
            )}

            <WaitingNotice failed={status.last_attempt_status === 'failed'} />

            <div className="vult-pay-secondary-actions">
              <button
                type="button"
                className="button secondary"
                onClick={undefined}
                disabled
              >
                Order {status.order_number}
              </button>

              <Link className="button secondary" href={returnHref}>
                Back to {kind === 'vote' ? 'Nominees' : 'Event'}
              </Link>
            </div>

            <PoweredByVult />
          </>
        ) : (
          <>
            <div className="vult-pay-brand-card">
              <Image
                src="/LOGOvult-horizontal-DARK-BLUE.svg"
                alt="Vult"
                width={160}
                height={58}
                priority
              />
            </div>

            <span className="vult-pay-kicker">Secure payment</span>
            <h1>Vult App Payment</h1>
            <p className="vult-pay-subtitle">
              Scan the QR code or open the Vult payment link to complete payment.
            </p>

            {qrDataUrl ? (
              <div className="vult-qr-card">
                {/* qrcode creates an in-memory data URL from the Vult payment link. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="Vult payment QR code"
                  width={360}
                  height={360}
                />
              </div>
            ) : (
              <div className="live-vult-note">
                <strong>Payment link is being prepared</strong>
                <p>
                  Keep this page open. The payment status refreshes automatically.
                </p>
              </div>
            )}

            {status.payment_link && (
              <OpenVultPayment href={status.payment_link} />
            )}

            <WaitingNotice failed={status.last_attempt_status === 'failed'} />

            <div className="vult-pay-secondary-actions">
              <div className="vult-pay-order-reference">
                <span>Order</span>
                <strong>{status.order_number}</strong>
              </div>

              <Link className="button secondary" href={returnHref}>
                Back to {kind === 'vote' ? 'Nominees' : 'Event'}
              </Link>
            </div>

            <PoweredByVult />
          </>
        )}

        {waiting && !completed && (
          <div className="vult-refresh-note vult-refresh-centered">
            <RefreshCw size={15} />
            Payment status refreshes automatically.
          </div>
        )}
      </section>
    </main>
  )
}

function WaitingNotice({
  failed,
}: {
  failed: boolean
}) {
  return (
    <div className="vult-waiting-notice">
      <span aria-hidden="true">⌛</span>
      <strong>
        {failed
          ? 'The last payment attempt did not complete. You can try again.'
          : 'Waiting for payment confirmation. This can sometimes take a little longer.'}
      </strong>
    </div>
  )
}

function PoweredByVult() {
  return (
    <div className="vult-powered-by">
      <span>Powered by</span>
      <Image
        src="/LOGOvult-horizontal-DARK-BLUE.svg"
        alt="Vult"
        width={62}
        height={24}
      />
    </div>
  )
}
