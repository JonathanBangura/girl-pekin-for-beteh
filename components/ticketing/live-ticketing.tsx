import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  Ticket,
} from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
  SectionHeading,
} from '@/components/public/public'
import {
  getPublicEventBySlug,
  getPublicEvents,
  getPublicTicketCheckoutOffer,
  getPublicTicketOrderStatus,
} from '@/lib/ticketing/live-data'
import { LiveTicketSelector } from './live-ticket-selector'
import { LiveTicketCheckoutForm } from './live-ticket-checkout-form'

function formatDate(value?: string | null) {
  if (!value) return 'To be confirmed'
  return new Intl.DateTimeFormat('en-SL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value?: string | null) {
  if (!value) return 'To be confirmed'
  return new Intl.DateTimeFormat('en-SL', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function money(value: number, currency: string) {
  return `${currency === 'SLE' ? 'NLe' : currency} ${value.toLocaleString()}`
}

function priceLabel(type: {
  pricing_type: string
  price: number | null
  min_donation: number | null
  currency: string
}) {
  if (type.pricing_type === 'donation') {
    return type.min_donation && type.min_donation > 0
      ? `From ${money(type.min_donation, type.currency)}`
      : 'By Donation'
  }

  if (type.pricing_type === 'free') return 'Free'

  return money(type.price ?? 0, type.currency)
}

export async function PublicEventsLivePage() {
  const events = await getPublicEvents()

  return (
    <>
      <PublicHeader />
      <main>
        <section className="page-hero v2-page-hero">
          <SectionHeading
            label="Events"
            title={<>Events & engagement.</>}
            copy="Browse published foundation events and current ticket availability."
          />
        </section>

        <section className="section mobile-section">
          {events.length ? (
            <div className="live-event-grid">
              {events.map((event) => (
                <article className="live-event-card" key={event.id}>
                  <div
                    className="live-event-cover"
                    style={
                      event.cover_image_url
                        ? {
                            backgroundImage: `url("${event.cover_image_url}")`,
                          }
                        : undefined
                    }
                  >
                    {!event.cover_image_url && (
                      <CalendarDays size={34} />
                    )}
                  </div>

                  <div className="live-event-card-body">
                    <Pill tone="gold">
                      {event.access_type.replaceAll('_', ' ')}
                    </Pill>
                    <h2>{event.title}</h2>
                    <p>{event.summary || 'Event information.'}</p>

                    <div className="live-event-meta">
                      <span>
                        <CalendarDays size={15} />
                        {formatDate(event.starts_at)}
                      </span>
                      <span>
                        <MapPin size={15} />
                        {event.venue || 'Venue to be confirmed'}
                      </span>
                    </div>

                    <Link
                      className="text-button"
                      href={`/events/${event.slug}`}
                    >
                      View event <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="live-public-empty">
              No public events are available right now.
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

export async function PublicEventDetailLivePage({
  slug,
}: {
  slug: string
}) {
  const data = await getPublicEventBySlug(slug)
  if (!data) notFound()

  const artwork =
    data.event.cover_image_url ||
    (data.event.slug === '50misa-2026'
      ? '/campaigns/50misa-2026-official.png'
      : null)

  return (
    <>
      <PublicHeader />
      <main>
        <section className="v2-event-detail-hero mobile-event-hero">
          <div>
            <span className="v2-overline light">Event</span>
            <h1>{data.event.title}</h1>
            <p>
              {data.event.summary ||
                'Official event information and ticket access.'}
            </p>

            <div className="hero-actions mobile-hero-actions">
              {data.event.status === 'published' &&
                data.event.access_type === 'paid' &&
                data.ticketTypes.length > 0 && (
                  <Link
                    className="button light"
                    href={`/events/${data.event.slug}/tickets`}
                  >
                    <Ticket size={15} /> Choose tickets
                  </Link>
                )}
            </div>
          </div>

          <div className="v2-event-poster mobile-event-poster">
            {artwork ? (
              <Image
                src={artwork}
                alt={`${data.event.title} artwork`}
                fill
                sizes="(max-width: 800px) 100vw, 400px"
                className="v2-award-artwork-image"
              />
            ) : (
              <div className="live-award-poster-placeholder">
                <CalendarDays size={42} />
                <span>Event</span>
              </div>
            )}
          </div>
        </section>

        <section className="section v2-event-info-grid mobile-event-info">
          <div>
            <CalendarDays size={18} />
            <span>
              <small>Date</small>
              <strong>{formatDate(data.event.starts_at)}</strong>
            </span>
          </div>

          <div>
            <Clock3 size={18} />
            <span>
              <small>Time</small>
              <strong>{formatTime(data.event.starts_at)}</strong>
            </span>
          </div>

          <div>
            <MapPin size={18} />
            <span>
              <small>Venue</small>
              <strong>{data.event.venue || 'To be confirmed'}</strong>
            </span>
          </div>
        </section>

        <section className="section section-surface v2-section-surface mobile-section">
          <div className="v2-event-ticket-preview mobile-ticket-preview">
            <div>
              <Pill tone="gold">Tickets</Pill>
              <h2>Choose the access tier that suits your attendance.</h2>
              <p>
                Ticket names and prices are configured for this event.
              </p>
            </div>

            <div className="v2-ticket-mini-table">
              {data.ticketTypes.map((type) => (
                <div key={type.id}>
                  <strong>{type.name}</strong>
                  <span>{priceLabel(type)}</span>
                </div>
              ))}
            </div>

            {data.event.status === 'published' &&
              data.event.access_type === 'paid' &&
              data.ticketTypes.length > 0 && (
                <Link
                  className="button"
                  href={`/events/${data.event.slug}/tickets`}
                >
                  Select tickets
                </Link>
              )}
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

export async function PublicTicketsLivePage({
  slug,
}: {
  slug: string
}) {
  const data = await getPublicEventBySlug(slug)
  if (!data) notFound()

  return (
    <>
      <PublicHeader />
      <main className="section tickets-page professional-form-page mobile-transaction-page">
        <div className="transaction-header">
          <div>
            <Pill tone="gold">Ticketing</Pill>
            <h1>Select your ticket.</h1>
            <p>{data.event.title}</p>
          </div>

          <div className="transaction-meta">
            <span>
              <CalendarDays size={16} />
              {formatDate(data.event.starts_at)} ·{' '}
              {formatTime(data.event.starts_at)}
            </span>
            <span>
              <MapPin size={16} />
              {data.event.venue || 'Venue to be confirmed'}
            </span>
          </div>
        </div>

        {data.event.status !== 'published' ? (
          <div className="live-public-empty">
            Ticket sales are currently closed for this event.
          </div>
        ) : data.ticketTypes.length ? (
          <LiveTicketSelector
            eventSlug={data.event.slug}
            ticketTypes={data.ticketTypes}
          />
        ) : (
          <div className="live-public-empty">
            No active ticket types are currently available.
          </div>
        )}
      </main>
      <PublicFooter />
    </>
  )
}

export async function PublicTicketCheckoutLivePage({
  slug,
  ticketTypeId,
  quantity,
  donation,
}: {
  slug: string
  ticketTypeId: string
  quantity: number
  donation: number | null
}) {
  const offer = await getPublicTicketCheckoutOffer({
    slug,
    ticketTypeId,
  })

  if (!offer) notFound()

  const max = offer.ticketType.max_per_order ?? 20
  const safeQuantity = Math.max(
    1,
    Math.min(max, Math.floor(quantity)),
  )

  const unitAmount =
    offer.ticketType.pricing_type === 'donation'
      ? Math.max(0, donation ?? 0)
      : offer.ticketType.price ?? 0

  const donationValid =
    offer.ticketType.pricing_type !== 'donation' ||
    (unitAmount > 0 &&
      unitAmount >= (offer.ticketType.min_donation ?? 0))

  const total = unitAmount * safeQuantity

  return (
    <>
      <PublicHeader />
      <main className="section checkout-page professional-form-page mobile-transaction-page">
        <div className="transaction-header">
          <div>
            <Pill tone="gold">Event Checkout</Pill>
            <h1>Review your ticket order.</h1>
            <p>{offer.event.title}</p>
          </div>

          <div className="transaction-meta">
            <span>
              {formatDate(offer.event.starts_at)} ·{' '}
              {formatTime(offer.event.starts_at)}
            </span>
            <span>{offer.event.venue || 'Venue to be confirmed'}</span>
          </div>
        </div>

        {!offer.salesOpen || !donationValid ? (
          <div className="live-public-empty">
            {!offer.salesOpen
              ? 'Ticket sales are not currently open for this selection.'
              : 'The donation amount is below the configured minimum.'}
          </div>
        ) : offer.ticketType.pricing_type === 'free' ? (
          <div className="live-public-empty">
            Free registration uses a separate registration workflow.
          </div>
        ) : (
          <div className="transaction-layout checkout-layout mobile-first-ticket-layout">
            <LiveTicketCheckoutForm
              eventSlug={offer.event.slug}
              ticketTypeId={offer.ticketType.id}
              ticketTypeName={offer.ticketType.name}
              quantity={safeQuantity}
              donationPerTicket={
                offer.ticketType.pricing_type === 'donation'
                  ? unitAmount
                  : null
              }
            />

            <aside className="panel order-summary professional-order-summary mobile-ticket-summary">
              <Pill tone="teal">Order summary</Pill>

              <div className="summary-line">
                <span>Ticket tier</span>
                <strong>{offer.ticketType.name}</strong>
              </div>

              <div className="summary-line">
                <span>
                  {offer.ticketType.pricing_type === 'donation'
                    ? 'Donation per ticket'
                    : 'Unit price'}
                </span>
                <strong>
                  {money(unitAmount, offer.ticketType.currency)}
                </strong>
              </div>

              <div className="summary-line">
                <span>Quantity</span>
                <strong>{safeQuantity}</strong>
              </div>

              <div className="summary-line">
                <span>Total admissions</span>
                <strong>
                  {safeQuantity *
                    offer.ticketType.admissions_per_unit}
                </strong>
              </div>

              <div className="summary-total">
                <span>Total</span>
                <strong>
                  {money(total, offer.ticketType.currency)}
                </strong>
                <small>
                  {money(unitAmount, offer.ticketType.currency)} ×{' '}
                  {safeQuantity}
                </small>
              </div>

              <p className="secure-note">
                The server performs the final capacity and pricing check when
                you create the order.
              </p>
            </aside>
          </div>
        )}
      </main>
      <PublicFooter />
    </>
  )
}

export async function PublicTicketOrderStatusLivePage({
  token,
}: {
  token: string
}) {
  const order = await getPublicTicketOrderStatus(token)
  if (!order) notFound()

  return (
    <>
      <PublicHeader />
      <main className="section professional-form-page mobile-transaction-page">
        <section className="panel live-vote-order-status mobile-order-status">
          <Pill tone="gold">Ticket Order</Pill>
          <h1>{order.order_number}</h1>
          <p>{order.event_title}</p>

          <div className="live-order-status-grid">
            <div>
              <span>Ticket tier</span>
              <strong>{order.ticket_type_name}</strong>
            </div>
            <div>
              <span>Quantity</span>
              <strong>{order.quantity}</strong>
            </div>
            <div>
              <span>Admissions</span>
              <strong>{order.admissions}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>
                {money(Number(order.total_amount), order.currency)}
              </strong>
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
                No QR ticket is issued until the server verifies a successful
                Vult payment.
              </p>
            </div>
          )}

          {Number(order.issued_tickets) > 0 && (
            <div className="live-form-message success">
              {order.issued_tickets} active ticket
              {Number(order.issued_tickets) === 1 ? '' : 's'} issued.
            </div>
          )}

          <Link
            className="button secondary"
            href={`/events/${order.event_slug}`}
          >
            Return to event
          </Link>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
