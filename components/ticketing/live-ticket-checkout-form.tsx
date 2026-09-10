'use client'

import { FormEvent, useState } from 'react'
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const formData = new FormData(event.currentTarget)

    const response = await fetch('/api/ticketing/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event_slug: eventSlug,
        ticket_type_id: ticketTypeId,
        quantity,
        donation_per_ticket: donationPerTicket,
        purchaser_name: String(
          formData.get('purchaser_name') ?? '',
        ),
        purchaser_email: String(
          formData.get('purchaser_email') ?? '',
        ),
        purchaser_phone: String(
          formData.get('purchaser_phone') ?? '',
        ),
        payment_method: String(
          formData.get('payment_method') ?? 'in-app',
        ),
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(
        body.error || 'Unable to create ticket payment.',
      )
      setLoading(false)
      return
    }

    if (body.status_url) {
      window.location.assign(body.status_url)
      return
    }

    setMessage(
      'Payment request created. Open the order status to continue.',
    )
    setLoading(false)
  }

  return (
    <section className="panel checkout-form-card mobile-checkout-card">
      <h2>Guest information</h2>
      <p>
        Enter the primary purchaser details for the{' '}
        {ticketTypeName} order.
      </p>

      <form
        onSubmit={submit}
        className="mobile-ticket-checkout-form"
      >
        <label>
          Full name
          <input
            name="purchaser_name"
            autoComplete="name"
            required
          />
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
          <div
            className="live-form-message error"
            role="alert"
          >
            {message}
          </div>
        )}

        <button
          className="button checkout-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Connecting to Vult…'
            : 'Continue to Vult payment'}
        </button>

        <p className="secure-note">
          Payment is confirmed by Vult before the ticket order is
          marked paid.
        </p>
      </form>
    </section>
  )
}
