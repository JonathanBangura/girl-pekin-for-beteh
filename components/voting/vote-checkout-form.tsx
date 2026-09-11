'use client'

import { FormEvent, useEffect, useState } from 'react'
import { VultPaymentMethodField } from '@/components/payments/vult-payment-method'

export function VoteCheckoutForm({
  nomineeCode,
  nomineeName,
  quantity,
}: {
  nomineeCode: string
  nomineeName: string
  quantity: number
  unitPrice: number
  total: number
  currency: string
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset transient submit state when this page is restored from the browser's
  // back/forward cache. Without this, returning from Vult can restore the
  // checkout with loading=true and leave the button stuck.
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

    const response = await fetch('/api/voting/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nominee_code: nomineeCode,
        quantity,
        buyer_name: String(formData.get('buyer_name') ?? ''),
        buyer_email: String(formData.get('buyer_email') ?? ''),
        buyer_phone: String(formData.get('buyer_phone') ?? ''),
        payment_method: paymentMethod,
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(body.error || 'Unable to create vote payment.')
      setLoading(false)
      return
    }

    // Clear loading before navigation and also reset it on pageshow above.
    setLoading(false)

    if (paymentMethod === 'card' && body.payment_url) {
      window.location.assign(body.payment_url)
      return
    }

    if (body.status_url) {
      window.location.assign(body.status_url)
      return
    }

    setMessage(
      'Payment request was created, but no payment instruction was returned.',
    )
  }

  return (
    <section className="panel checkout-form-card">
      <h2>Contact information</h2>
      <p>
        Used to identify and support the vote order for {nomineeName}.
      </p>

      <form onSubmit={submit} className="live-vote-contact-form">
        <label>
          Full name
          <input name="buyer_name" autoComplete="name" required />
        </label>

        <label>
          Email address
          <input
            name="buyer_email"
            type="email"
            autoComplete="email"
          />
        </label>

        <label>
          Phone number
          <input
            name="buyer_phone"
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
          Votes are added only after Vult sends a verified completed-payment
          webhook.
        </p>
      </form>
    </section>
  )
}
