'use client'

import { useState } from 'react'

export function ResendTicketEmailButton({
  token,
}: {
  token: string
}) {
  const [state, setState] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle')
  const [message, setMessage] = useState('')

  async function resend() {
    setState('sending')
    setMessage('')

    const response = await fetch(
      `/api/tickets/order/${token}/resend`,
      { method: 'POST' },
    )

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      setState('error')
      setMessage(
        body.error || 'Unable to resend the ticket email.',
      )
      return
    }

    setState('sent')
    setMessage('Ticket email sent again.')
  }

  return (
    <div className="ticket-wallet-resend">
      <button
        className="button secondary"
        type="button"
        disabled={state === 'sending'}
        onClick={resend}
      >
        {state === 'sending'
          ? 'Sending…'
          : state === 'sent'
            ? 'Email sent'
            : 'Email tickets again'}
      </button>

      {message && (
        <small
          className={
            state === 'error'
              ? 'ticket-wallet-error'
              : 'ticket-wallet-success'
          }
        >
          {message}
        </small>
      )}
    </div>
  )
}
