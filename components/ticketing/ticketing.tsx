'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CalendarDays, MapPin, Minus, Plus, Ticket } from 'lucide-react'
import { ticketTiers, eventDetails } from '@/lib/mock-data'
import { PublicHeader, PublicFooter, Pill } from '@/components/public/public'

export function TicketsScreen() {
  const [selected, setSelected] = useState(ticketTiers[0])
  const [quantity, setQuantity] = useState(1)
  const [donation, setDonation] = useState('')
  const donationPerTicket = Math.max(0, Number(donation || 0))
  const unitPrice = selected.price || donationPerTicket
  const total = unitPrice * quantity
  const query = new URLSearchParams({ tier: selected.name, quantity: String(quantity) })
  if (selected.price === 0 && donationPerTicket > 0) query.set('donation', String(donationPerTicket))

  return (
    <>
      <PublicHeader/>
      <main className="section tickets-page professional-form-page">
        <div className="transaction-header">
          <div>
            <Pill tone="gold">Ticketing · {eventDetails.edition}</Pill>
            <h1>Select your ticket.</h1>
            <p>{eventDetails.title}</p>
          </div>
          <div className="transaction-meta">
            <span><CalendarDays size={16}/>{eventDetails.date} · {eventDetails.time}</span>
            <span><MapPin size={16}/>{eventDetails.location}</span>
          </div>
        </div>

        <div className="transaction-layout">
          <section>
            <div className="transaction-section-title"><span>1</span><div><h2>Choose a ticket tier</h2><p>Ticket names and prices are specific to this event.</p></div></div>
            <div className="ticket-grid professional-ticket-grid">
              {ticketTiers.map(t => (
                <button className={`ticket-type-card ${selected.name === t.name ? 'selected' : ''}`} key={t.name} onClick={() => setSelected(t)}>
                  <span className="ticket-icon"><Ticket size={17}/></span>
                  <small>{t.state}</small>
                  <h3>{t.name}</h3>
                  <b>{t.displayPrice}</b>
                  <span className="ticket-select-label">{selected.name === t.name ? 'Selected' : 'Select ticket'}</span>
                </button>
              ))}
            </div>
          </section>

          <aside className="panel order-summary professional-order-summary">
            <Pill tone="teal">Order summary</Pill>
            <div className="summary-line"><span>Ticket tier</span><strong>{selected.name}</strong></div>
            <div className="summary-line"><span>Pricing</span><strong>{selected.price ? selected.displayPrice : 'Donation per ticket'}</strong></div>

            {selected.price === 0 && (
              <label className="form-field">Donation per ticket
                <div className="money-input"><span>NLe</span><input aria-label="Donation amount per ticket" inputMode="numeric" placeholder="Enter amount" value={donation} onChange={e => setDonation(e.target.value.replace(/[^0-9.]/g, ''))}/></div>
              </label>
            )}

            <div className="form-field">Quantity
              <div className="quantity professional-quantity">
                <button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15}/></button>
                <b>{quantity}</b>
                <button aria-label="Increase quantity" onClick={() => setQuantity(quantity + 1)}><Plus size={15}/></button>
              </div>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <strong>NLe {total.toLocaleString()}</strong>
              {selected.price === 0 && donationPerTicket > 0 && <small>NLe {donationPerTicket.toLocaleString()} × {quantity} ticket{quantity > 1 ? 's' : ''}</small>}
            </div>

            <Link className={`button checkout-button ${selected.price === 0 && donationPerTicket <= 0 ? 'disabled-link' : ''}`} aria-disabled={selected.price === 0 && donationPerTicket <= 0} href={selected.price === 0 && donationPerTicket <= 0 ? '#' : `/events/50misa-2026/checkout?${query.toString()}`}>Continue to checkout</Link>
            <p className="secure-note">Frontend preview only. Payment processing will be connected later.</p>
          </aside>
        </div>
      </main>
      <PublicFooter/>
    </>
  )
}
