'use client'

import { useState } from 'react'

type RegistrationType = {
  id: string
  name: string
  description: string | null
  max_per_order: number | null
  admissions_per_unit: number
}

export function FreeRegistrationForm({
  eventSlug,
  ticketTypes,
}: {
  eventSlug: string
  ticketTypes: RegistrationType[]
}) {
  const [ticketTypeId, setTicketTypeId] =
    useState(
      ticketTypes[0]?.id ?? '',
    )
  const [quantity, setQuantity] =
    useState(1)
  const [name, setName] =
    useState('')
  const [email, setEmail] =
    useState('')
  const [phone, setPhone] =
    useState('')
  const [busy, setBusy] =
    useState(false)
  const [error, setError] =
    useState('')

  const selected =
    ticketTypes.find(
      (type) =>
        type.id ===
        ticketTypeId,
    ) ?? null

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
        '/api/events/register',
        {
          method: 'POST',
          headers: {
            'content-type':
              'application/json',
          },
          body: JSON.stringify({
            event_slug: eventSlug,
            ticket_type_id:
              ticketTypeId,
            quantity,
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
            'Registration could not be completed.',
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
        Registration type
        <select
          value={ticketTypeId}
          onChange={(event) =>
            setTicketTypeId(
              event.target.value,
            )
          }
          required
        >
          {ticketTypes.map(
            (type) => (
              <option
                key={type.id}
                value={type.id}
              >
                {type.name}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        Number of registrations
        <input
          type="number"
          min="1"
          max={
            selected
              ?.max_per_order ??
            undefined
          }
          value={quantity}
          onChange={(event) =>
            setQuantity(
              Math.max(
                1,
                Number(
                  event.target
                    .value,
                ) || 1,
              ),
            )
          }
          required
        />
        {selected ? (
          <small>
            {selected.admissions_per_unit}{' '}
            admission
            {selected.admissions_per_unit ===
            1
              ? ''
              : 's'}{' '}
            per registration unit.
          </small>
        ) : null}
      </label>

      <label>
        Full name
        <input
          value={name}
          onChange={(event) =>
            setName(
              event.target.value,
            )
          }
          autoComplete="name"
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
          autoComplete="email"
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
          autoComplete="tel"
        />
      </label>

      <button
        className="button"
        type="submit"
        disabled={
          busy ||
          !ticketTypeId
        }
      >
        {busy
          ? 'Confirming...'
          : 'Complete Free Registration'}
      </button>
    </form>
  )
}
