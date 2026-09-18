'use client'

import Link from 'next/link'
import { useState } from 'react'

export function InvitationClaimForm({
  token,
  inviteeName,
  status,
  claimedPublicToken,
}: {
  token: string
  inviteeName: string
  status: string
  claimedPublicToken?: string | null
}) {
  const [name, setName] =
    useState(inviteeName)
  const [email, setEmail] =
    useState('')
  const [phone, setPhone] =
    useState('')
  const [busy, setBusy] =
    useState(false)
  const [error, setError] =
    useState('')

  if (
    status === 'claimed' &&
    claimedPublicToken
  ) {
    return (
      <div className="live-public-empty">
        <strong>
          Invitation already
          claimed.
        </strong>
        <p>
          Your admission has
          already been issued.
        </p>
        <Link
          className="button"
          href={`/tickets/order/${claimedPublicToken}`}
        >
          Open My Tickets
        </Link>
      </div>
    )
  }

  if (status !== 'pending') {
    return (
      <div className="live-public-empty">
        This invitation is{' '}
        {status}.
      </div>
    )
  }

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!email.trim() && !phone.trim()) {
      setError(
        'Enter an email address or phone number.',
      )
      return
    }

    setBusy(true)
    setError('')

    try {
      const response = await fetch(
        '/api/events/invitations/claim',
        {
          method: 'POST',
          headers: {
            'content-type':
              'application/json',
          },
          body: JSON.stringify({
            token,
            name,
            email,
            phone,
          }),
        },
      )

      const body =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        setError(
          body.error ||
            'Invitation could not be claimed.',
        )
        return
      }

      if (body.wallet_url) {
        window.location.assign(
          body.wallet_url,
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="professional-form"
      onSubmit={submit}
    >
      {error ? (
        <div className="live-form-message error">
          {error}
        </div>
      ) : null}

      <label>
        Guest name
        <input
          value={name}
          onChange={(event) =>
            setName(
              event.target.value,
            )
          }
          required
        />
      </label>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value,
            )
          }
        />
      </label>

      <label>
        Phone
        <input
          value={phone}
          onChange={(event) =>
            setPhone(
              event.target.value,
            )
          }
        />
      </label>

      <button
        className="button"
        type="submit"
        disabled={busy}
      >
        {busy
          ? 'Claiming...'
          : 'Claim Invitation'}
      </button>
    </form>
  )
}
