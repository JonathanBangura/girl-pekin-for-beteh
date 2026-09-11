'use client'

import { FormEvent, useEffect, useState } from 'react'
import { VultPaymentMethodField } from '@/components/payments/vult-payment-method'

export function LiveTicketCheckoutForm({
  eventSlug,
  ticketTypeId,
  ticketTypeName,
  quantity,
  donationPerTicket,
}: {
  eventSlug: string
  ticketTypeId: string
  ticketTypeName: string
  quantity: number
  donationPerTicket: number | null
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Browsers can restore this page from the back/forward cache with React
  // state exactly as it was when the customer left. Reset transient submit
  // state whenever the page becomes active again so the button never stays
  // stuck on "Connecting to Vult…".
  useEffect(() => {
    function resetTransientPaymentState() {
      setLoading(false)
    }

    window.addEventListener('pageshow', resetTransientPaymentState)

    return () => {
      window.removeEventListener('pageshow', resetTransientPaymentState)
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const formData = new FormData(event.currentTarget)
    const paymentMethod = String(
      formData.get('payment_method') ?? 'in-app',
    )

    const response = await fetch('/api/ticketing/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event_slug: eventSlug,
        ticket_type_id: ticketTypeId,
        quantity,
        donation_per_ticket: donationPerTicket,
        purchaser_name: String(formData.get('purchaser_name') ?? ''),
        purchaser_email: String(formData.get('purchaser_email') ?? ''),
        purchaser_phone: String(formData.get('purchaser_phone') ?? ''),
        payment_method: paymentMethod,
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(body.error || 'Unable to create ticket payment.')
      setLoading(false)
      return
    }

    // Reset before leaving the page as an additional safeguard. If the browser
    // later restores this checkout from BFCache, pageshow above resets it too.
    setLoading(false)

    // Card goes directly to the Vult-provided card checkout page.
    if (paymentMethod === 'card' && body.payment_url) {
      window.location.assign(body.payment_url)
      return
    }

    // Vult App and Mobile Money use our payment instruction/status page.
    if (body.status_url) {
      window.location.assign(body.status_url)
      return
    }

    setMessage(
      'Payment request was created, but no payment instruction was returned.',
    )
  }

  return (
    <section className="panel checkout-form-card mobile-checkout-card">
      <h2>Guest information</h2>
      <p>
        Enter the primary purchaser details for the {ticketTypeName} order.
      </p>

      <form onSubmit={submit} className="mobile-ticket-checkout-form">
        <label>
          Full name
          <input name="purchaser_name" autoComplete="name" required />
        </label>

        <label>
          Email address
          <input
            name="purchaser_email"
            type="email"
            autoComplete="email"
          />
        </label>

        <label>
          Phone number
          <input
            name="purchaser_phone"
            type="tel"
            autoComplete="tel"
            placeholder="+232 ..."
          />
        </label>

        <p className="secure-note">
          Provide at least an email address or phone number.
        </p>

        <VultPaymentMethodField disabled={loading} />

        {message && (
          <div className="live-form-message error" role="alert">
            {message}
          </div>
        )}

        <button
          className="button checkout-button"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Connecting to Vult…' : 'Continue to payment'}
        </button>

        <p className="secure-note">
          Payment is confirmed by Vult before the ticket order is marked paid.
        </p>
      </form>
    </section>
  )
}
