import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
} from '@/components/public/public'
import {
  getPublicVultPaymentStatus,
  type PublicVultOrderKind,
} from '@/lib/vult/public'
import { PaymentStatusRefresh } from './payment-status-refresh'

function money(value: unknown, currency: string) {
  const amount = Number(value ?? 0)

  return `${currency === 'SLE' ? 'NLe' : currency} ${amount.toLocaleString()}`
}

function methodLabel(value?: string | null) {
  if (value === 'card') return 'Card'
  if (value === 'momo') return 'Mobile Money'
  return 'Vult App'
}

export async function VultPaymentStatusPage({
  kind,
  token,
}: {
  kind: PublicVultOrderKind
  token: string
}) {
  const status = await getPublicVultPaymentStatus(
    kind,
    token,
  )

  if (!status) notFound()

  const completed = status.payment_status === 'succeeded'
  const waiting =
    status.payment_status === 'processing' ||
    status.payment_status === 'pending'

  return (
    <>
      <PaymentStatusRefresh active={!completed} />

      <PublicHeader />

      <main className="section professional-form-page mobile-transaction-page">
        <section className="panel vult-payment-status-card">
          <Pill tone={completed ? 'teal' : 'gold'}>
            {completed ? 'Payment confirmed' : 'Vult Payment'}
          </Pill>

          <h1>{status.order_number}</h1>
          <p>
            {status.reference_name}
            {status.reference_code
              ? ` · ${status.reference_code}`
              : ''}
          </p>

          <div className="live-order-status-grid">
            <div>
              <span>Order type</span>
              <strong>{kind}</strong>
            </div>

            <div>
              <span>Payment method</span>
              <strong>
                {methodLabel(status.payment_method)}
              </strong>
            </div>

            <div>
              <span>Total</span>
              <strong>
                {money(
                  status.total_amount,
                  status.currency,
                )}
              </strong>
            </div>

            <div>
              <span>Payment status</span>
              <strong>{status.payment_status}</strong>
            </div>
          </div>

          {completed ? (
            <div className="vult-payment-success">
              <CheckCircle2 size={22} />

              <div>
                <strong>Payment received.</strong>

                <p>
                  {kind === 'vote'
                    ? 'Your successful payment has been allocated to the nominee vote ledger.'
                    : Number(status.issued_tickets) > 0
                      ? `${status.issued_tickets} ticket${Number(status.issued_tickets) === 1 ? '' : 's'} issued.`
                      : 'Your ticket order is paid. Your individual QR tickets are being prepared.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {status.last_attempt_status === 'failed' && (
                <div className="live-vult-note">
                  <strong>
                    The last payment attempt did not complete.
                  </strong>
                  <p>
                    The order remains open so you can retry the
                    payment.
                  </p>
                </div>
              )}

              {status.payment_code && (
                <div className="vult-payment-code">
                  <span>Mobile-money payment code</span>
                  <strong>{status.payment_code}</strong>
                  <small>
                    Dial or use this code to complete the payment,
                    then keep this page open while the status
                    refreshes.
                  </small>
                </div>
              )}

              {status.payment_link && (
                <a
                  className="button checkout-button"
                  href={status.payment_link}
                >
                  Continue to Vult
                  <ExternalLink size={15} />
                </a>
              )}

              {waiting && (
                <div className="vult-refresh-note">
                  <RefreshCw size={15} />
                  Payment status refreshes automatically.
                </div>
              )}
            </>
          )}

          <Link
            className="button secondary"
            href={
              kind === 'vote'
                ? '/nominees'
                : `/events/${status.reference_code}`
            }
          >
            {kind === 'vote'
              ? 'Return to nominees'
              : 'Return to event'}
          </Link>
        </section>
      </main>

      <PublicFooter />
    </>
  )
}
