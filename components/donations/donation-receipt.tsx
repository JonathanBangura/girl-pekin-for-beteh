import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
} from '@/components/public/public'
import { DonationReceiptActions } from '@/components/donations/receipt-actions'
import type { PublicDonationReceipt } from '@/lib/donations/public-data'

function money(value: number, currency: string) {
  const label = currency === 'SLE' ? 'NLe' : currency
  return `${label} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function dateTime(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

function methodLabel(value: string) {
  if (value === 'in-app') return 'Vult App'
  if (value === 'momo') return 'Mobile Money'
  if (value === 'card') return 'Debit/Credit Card'
  return 'Electronic payment'
}

export function DonationReceiptPage({
  receipt,
}: {
  receipt: PublicDonationReceipt
}) {
  return (
    <>
      <PublicHeader />

      <main className="donation-receipt-page">
        <section className="donation-receipt-card">
          <div className="donation-receipt-success">
            <CheckCircle2 size={32} />
            <div>
              <span className="v2-overline">
                Donation acknowledgement
              </span>
              <h1>Thank you for your support.</h1>
              <p>
                Girl Pikin For Betteh Foundation acknowledges
                receipt of your contribution.
              </p>
            </div>
          </div>

          <div className="donation-receipt-reference">
            <span>Donation reference</span>
            <strong>{receipt.donation_number}</strong>
          </div>

          <dl className="donation-receipt-details">
            <div>
              <dt>Donor</dt>
              <dd>{receipt.donor_display_name}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>
                {money(receipt.amount, receipt.currency)}
              </dd>
            </div>
            <div>
              <dt>Fund / campaign</dt>
              <dd>{receipt.campaign_title}</dd>
            </div>
            <div>
              <dt>Fund type</dt>
              <dd>
                {receipt.fund_type === 'unrestricted'
                  ? 'Unrestricted'
                  : 'Designated / Restricted'}
              </dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>{methodLabel(receipt.payment_method)}</dd>
            </div>
            <div>
              <dt>Transaction reference</dt>
              <dd>
                {receipt.provider_transaction_id || '—'}
              </dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>{dateTime(receipt.paid_at)}</dd>
            </div>
          </dl>

          <div className="donation-receipt-actions">
            <DonationReceiptActions />
            <Link className="button" href="/donate">
              Make another donation
            </Link>
          </div>

          <p className="donation-receipt-note">
            This document is a donation acknowledgement and
            payment receipt. It does not make any representation
            that the contribution is tax-deductible.
          </p>
        </section>
      </main>

      <PublicFooter />
    </>
  )
}
