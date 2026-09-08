'use client'

import { FormEvent, useState } from 'react'

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const formData = new FormData(event.currentTarget)

    const response = await fetch('/api/voting/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nominee_code: nomineeCode,
        quantity,
        buyer_name: String(formData.get('buyer_name') ?? ''),
        buyer_email: String(formData.get('buyer_email') ?? ''),
        buyer_phone: String(formData.get('buyer_phone') ?? ''),
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMessage(body.error || 'Unable to create vote order.')
      setLoading(false)
      return
    }

    if (body.status_url) {
      window.location.assign(body.status_url)
      return
    }

    setMessage(body.message || 'Vote order created.')
    setLoading(false)
  }

  return (
    <section className="panel checkout-form-card">
      <h2>Contact information</h2>
      <p>Used to identify and support the vote order for {nomineeName}.</p>

      <form onSubmit={submit} className="live-vote-contact-form">
        <label>
          Full name
          <input name="buyer_name" required />
        </label>

        <label>
          Email address
          <input name="buyer_email" type="email" />
        </label>

        <label>
          Phone number
          <input name="buyer_phone" type="tel" placeholder="+232 ..." />
        </label>

        <p className="secure-note">
          Provide at least an email address or phone number.
        </p>

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
          {loading ? 'Creating order…' : 'Create vote order'}
        </button>

        <p className="live-vult-warning">
          Vult payment initiation is intentionally not enabled yet. Creating an
          order does not allocate votes or mark payment successful.
        </p>
      </form>
    </section>
  )
}
