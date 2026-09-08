import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
} from '@/components/public/public'
import {
  getPublicVoteOffer,
  getPublicVoteOrderStatus,
} from '@/lib/voting/live-data'
import { VoteQuantitySelector } from './vote-quantity-selector'
import { VoteCheckoutForm } from './vote-checkout-form'

function money(value: number, currency: string) {
  return `${currency === 'SLE' ? 'NLe' : currency} ${value.toLocaleString()}`
}

export async function LiveVoteScreen({ code }: { code: string }) {
  const offer = await getPublicVoteOffer(code)
  if (!offer) notFound()

  const { nominee, edition, pricing, isOpen } = offer

  return (
    <>
      <PublicHeader />
      <main className="section vote-page professional-form-page">
        <div className="transaction-header">
          <div>
            <Pill tone="teal">Public Voting · {edition.year}</Pill>
            <h1>Vote for {nominee.full_name}.</h1>
            <p>
              Nominee code {nominee.nominee_code}
              {nominee.institution ? ` · ${nominee.institution}` : ''}
            </p>
          </div>

          <span className="transaction-security">
            <ShieldCheck size={17} />
            Server-validated vote checkout
          </span>
        </div>

        <div className="transaction-layout vote-layout">
          <article className="panel nominee-vote-profile">
            <Pill tone="teal">{nominee.category_name}</Pill>
            <h2>{nominee.full_name}</h2>
            <p className="nominee-institution">
              {nominee.institution || 'Institution not provided'}
            </p>
            <p>
              {nominee.bio ||
                'No public biography has been added for this nominee.'}
            </p>
          </article>

          <section className="panel order-summary professional-order-summary">
            {!isOpen ? (
              <>
                <Pill tone="gold">Voting unavailable</Pill>
                <h2>Voting is currently closed.</h2>
                <p>
                  The configured voting window for {edition.edition_label} is
                  not open.
                </p>
                <Link className="button secondary" href="/nominees">
                  Back to nominees
                </Link>
              </>
            ) : !pricing ? (
              <>
                <Pill tone="gold">Configuration required</Pill>
                <h2>Vote pricing is not available.</h2>
              </>
            ) : (
              <VoteQuantitySelector
                nomineeCode={nominee.nominee_code}
                unitPrice={pricing.unit_price}
                currency={pricing.currency}
                minQuantity={pricing.min_quantity}
                maxQuantity={pricing.max_quantity}
                quickQuantities={pricing.quick_quantities}
              />
            )}
          </section>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}

export async function LiveVoteCheckout({
  code,
  quantity,
}: {
  code: string
  quantity: number
}) {
  const offer = await getPublicVoteOffer(code)
  if (!offer) notFound()

  const { nominee, edition, pricing, isOpen } = offer

  if (!pricing) {
    return (
      <>
        <PublicHeader />
        <main className="section professional-form-page">
          <div className="live-public-empty">
            Vote pricing has not been configured.
          </div>
        </main>
        <PublicFooter />
      </>
    )
  }

  const safeQuantity = Math.min(
    pricing.max_quantity,
    Math.max(pricing.min_quantity, Math.floor(quantity)),
  )
  const total = safeQuantity * pricing.unit_price

  return (
    <>
      <PublicHeader />
      <main className="section checkout-page professional-form-page">
        <div className="transaction-header">
          <div>
            <Pill tone="teal">Vote Checkout · {edition.year}</Pill>
            <h1>Review your vote order.</h1>
            <p>{nominee.full_name} · {nominee.nominee_code}</p>
          </div>

          <span className="transaction-security">
            <ShieldCheck size={17} />
            Server pricing validation
          </span>
        </div>

        {!isOpen ? (
          <div className="live-public-empty">
            Voting is currently closed. No vote order can be created.
          </div>
        ) : (
          <div className="transaction-layout checkout-layout">
            <VoteCheckoutForm
              nomineeCode={nominee.nominee_code}
              nomineeName={nominee.full_name}
              quantity={safeQuantity}
              unitPrice={pricing.unit_price}
              total={total}
              currency={pricing.currency}
            />

            <aside className="panel order-summary professional-order-summary">
              <Pill tone="gold">Order summary</Pill>
              <div className="summary-line">
                <span>Nominee</span>
                <strong>{nominee.full_name}</strong>
              </div>
              <div className="summary-line">
                <span>Nominee code</span>
                <strong>{nominee.nominee_code}</strong>
              </div>
              <div className="summary-line">
                <span>Votes</span>
                <strong>{safeQuantity}</strong>
              </div>
              <div className="summary-line">
                <span>Price per vote</span>
                <strong>{money(pricing.unit_price, pricing.currency)}</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>{money(total, pricing.currency)}</strong>
              </div>
            </aside>
          </div>
        )}
      </main>
      <PublicFooter />
    </>
  )
}

export async function LiveVoteOrderStatus({ token }: { token: string }) {
  const order = await getPublicVoteOrderStatus(token)
  if (!order) notFound()

  return (
    <>
      <PublicHeader />
      <main className="section professional-form-page">
        <section className="panel live-vote-order-status">
          <Pill tone="gold">Vote Order</Pill>
          <h1>{order.order_number}</h1>
          <p>{order.nominee_name} · {order.nominee_code}</p>

          <div className="live-order-status-grid">
            <div>
              <span>Votes</span>
              <strong>{order.quantity}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{money(Number(order.total_amount), order.currency)}</strong>
            </div>
            <div>
              <span>Order status</span>
              <strong>{order.order_status}</strong>
            </div>
            <div>
              <span>Payment status</span>
              <strong>{order.payment_status}</strong>
            </div>
          </div>

          {order.payment_status !== 'succeeded' && (
            <div className="live-vult-note">
              <strong>Payment connection pending</strong>
              <p>
                No votes are allocated until a verified successful Vult
                payment is settled by the server.
              </p>
            </div>
          )}

          <Link className="button secondary" href="/nominees">
            Return to nominees
          </Link>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
