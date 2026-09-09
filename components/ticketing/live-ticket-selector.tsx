'use client'

import Link from 'next/link'
import { Minus, Plus, Ticket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Pill } from '@/components/public/public'

type TicketType = {
  id: string
  name: string
  description: string | null
  pricing_type: string
  price: number | null
  min_donation: number | null
  currency: string
  capacity: number | null
  max_per_order: number | null
  admissions_per_unit: number
}

function money(value: number, currency: string) {
  return `${currency === 'SLE' ? 'NLe' : currency} ${value.toLocaleString()}`
}

function typePrice(type: TicketType) {
  if (type.pricing_type === 'donation') {
    return type.min_donation && type.min_donation > 0
      ? `Donation from ${money(type.min_donation, type.currency)}`
      : 'By Donation'
  }

  if (type.pricing_type === 'free') return 'Free'

  return money(type.price ?? 0, type.currency)
}

export function LiveTicketSelector({
  eventSlug,
  ticketTypes,
}: {
  eventSlug: string
  ticketTypes: TicketType[]
}) {
  const [selectedId, setSelectedId] = useState(ticketTypes[0]?.id ?? '')
  const selected = useMemo(
    () => ticketTypes.find((type) => type.id === selectedId) ?? ticketTypes[0],
    [selectedId, ticketTypes],
  )

  const [quantity, setQuantity] = useState(1)
  const [donation, setDonation] = useState('')

  if (!selected) return null

  const max = selected.max_per_order ?? 20
  const safeQuantity = Math.max(1, Math.min(max, quantity))
  const donationValue = Math.max(0, Number(donation || 0))
  const unitAmount =
    selected.pricing_type === 'donation'
      ? donationValue
      : selected.price ?? 0
  const total = unitAmount * safeQuantity
  const donationValid =
    selected.pricing_type !== 'donation' ||
    (donationValue > 0 &&
      donationValue >= (selected.min_donation ?? 0))
  const canCheckout =
    selected.pricing_type !== 'free' && donationValid

  const query = new URLSearchParams({
    ticket_type: selected.id,
    quantity: String(safeQuantity),
  })

  if (selected.pricing_type === 'donation') {
    query.set('donation', String(donationValue))
  }

  function choose(type: TicketType) {
    setSelectedId(type.id)
    setQuantity(1)
    setDonation('')
  }

  return (
    <div className="transaction-layout mobile-first-ticket-layout">
      <section>
        <div className="transaction-section-title">
          <span>1</span>
          <div>
            <h2>Choose a ticket tier</h2>
            <p>
              Select one ticket tier for this order. Each admission receives
              its own individual QR ticket after successful payment.
            </p>
          </div>
        </div>

        <div className="ticket-grid professional-ticket-grid mobile-ticket-grid">
          {ticketTypes.map((type) => {
            const active = selected.id === type.id

            return (
              <button
                type="button"
                className={`ticket-type-card ${active ? 'selected' : ''}`}
                key={type.id}
                onClick={() => choose(type)}
              >
                <span className="ticket-icon">
                  <Ticket size={18} />
                </span>
                <small>
                  {type.admissions_per_unit} admission
                  {type.admissions_per_unit === 1 ? '' : 's'} per ticket
                </small>
                <h3>{type.name}</h3>
                <b>{typePrice(type)}</b>
                {type.description && <p>{type.description}</p>}
                <span className="ticket-select-label">
                  {active ? 'Selected' : 'Select ticket'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <aside className="panel order-summary professional-order-summary mobile-ticket-summary">
        <Pill tone="teal">Order summary</Pill>

        <div className="summary-line">
          <span>Ticket tier</span>
          <strong>{selected.name}</strong>
        </div>

        <div className="summary-line">
          <span>Pricing</span>
          <strong>{typePrice(selected)}</strong>
        </div>

        {selected.pricing_type === 'donation' && (
          <label className="form-field">
            Donation per ticket
            <div className="money-input mobile-money-input">
              <span>{selected.currency === 'SLE' ? 'NLe' : selected.currency}</span>
              <input
                aria-label="Donation amount per ticket"
                inputMode="decimal"
                placeholder="Enter amount"
                value={donation}
                onChange={(event) =>
                  setDonation(
                    event.target.value.replace(/[^0-9.]/g, ''),
                  )
                }
              />
            </div>
            {selected.min_donation != null &&
              selected.min_donation > 0 && (
                <small>
                  Minimum {money(selected.min_donation, selected.currency)}
                  {' '}per ticket.
                </small>
              )}
          </label>
        )}

        <div className="form-field">
          Quantity
          <div className="quantity professional-quantity mobile-quantity">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() =>
                setQuantity(Math.max(1, safeQuantity - 1))
              }
            >
              <Minus size={17} />
            </button>

            <input
              className="mobile-ticket-quantity-input"
              aria-label="Ticket quantity"
              type="number"
              min="1"
              max={max}
              value={safeQuantity}
              onChange={(event) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(max, Number(event.target.value) || 1),
                  ),
                )
              }
            />

            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() =>
                setQuantity(Math.min(max, safeQuantity + 1))
              }
            >
              <Plus size={17} />
            </button>
          </div>

          {selected.max_per_order && (
            <small>Maximum {selected.max_per_order} per order.</small>
          )}
        </div>

        <div className="summary-line">
          <span>Total admissions</span>
          <strong>
            {safeQuantity * selected.admissions_per_unit}
          </strong>
        </div>

        <div className="summary-total">
          <span>Total</span>
          <strong>{money(total, selected.currency)}</strong>
          <small>
            {safeQuantity} × {money(unitAmount, selected.currency)}
          </small>
        </div>

        {selected.pricing_type === 'free' ? (
          <div className="live-public-empty compact">
            Free registration will use its own registration workflow.
          </div>
        ) : (
          <Link
            className={`button checkout-button ${canCheckout ? '' : 'disabled-link'}`}
            aria-disabled={!canCheckout}
            href={
              canCheckout
                ? `/events/${eventSlug}/checkout?${query.toString()}`
                : '#'
            }
          >
            Continue to checkout
          </Link>
        )}

        <p className="secure-note">
          Price, sales window, capacity and order limits are validated again on
          the server.
        </p>
      </aside>
    </div>
  )
}
