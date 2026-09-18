import Link from 'next/link'
import {
  createEventInvitation,
  issueComplimentaryAdmission,
  revokeEventInvitation,
} from '@/lib/admin/event-access-actions'
import { getEventAccessAdminData } from '@/lib/ticketing/access-admin-data'

function humanize(
  value?: string | null,
) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    )
}

function dateTime(
  value?: string | null,
) {
  if (!value) return '—'

  return new Intl.DateTimeFormat(
    'en-SL',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Freetown',
    },
  ).format(new Date(value))
}

function Notice({
  invited,
  complimentary,
  revoked,
  error,
}: {
  invited?: string
  complimentary?: string
  revoked?: string
  error?: string
}) {
  if (invited === '1') {
    return (
      <div className="live-form-message success">
        Invitation created. Email
        delivery is attempted
        automatically when an email
        address is supplied.
      </div>
    )
  }

  if (complimentary === '1') {
    return (
      <div className="live-form-message success">
        Complimentary admission
        issued successfully.
      </div>
    )
  }

  if (revoked === '1') {
    return (
      <div className="live-form-message success">
        Invitation revoked.
      </div>
    )
  }

  if (!error) return null

  const messages: Record<
    string,
    string
  > = {
    invalid_invitation:
      'Complete the invitation details.',
    invalid_ticket_type:
      'Select a valid ticket type for this event.',
    not_invitation_event:
      'Invitations can only be created for an Invitation Only event.',
    quantity_limit:
      'The quantity exceeds the configured maximum per order.',
    invite_failed:
      'The invitation could not be created.',
    claimed_invitation:
      'A claimed invitation cannot be revoked. Cancel the issued ticket instead if access must be withdrawn.',
    invalid_complimentary:
      'Complete the complimentary admission details and reason.',
    complimentary_failed:
      'The complimentary admission could not be issued.',
  }

  return (
    <div className="live-form-message error">
      {messages[error] ||
        'The event access change could not be completed.'}
    </div>
  )
}

export async function EventAccessManagementPage({
  eventId,
  invited,
  complimentary,
  revoked,
  error,
}: {
  eventId?: string
  invited?: string
  complimentary?: string
  revoked?: string
  error?: string
}) {
  const data =
    await getEventAccessAdminData(
      eventId,
    )

  const selected =
    data.selectedEvent

  const ticketTypeMap =
    new Map(
      data.ticketTypes.map(
        (type) => [
          type.id,
          type.name,
        ],
      ),
    )

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Events / Access & Guests
          </span>
          <h1>Event Access</h1>
          <p>
            Manage free registration,
            invitation-only access and
            complimentary admissions.
          </p>
        </div>

        <div className="v2-admin-page-actions">
          <Link
            className="button secondary"
            href="/admin/events/tickets"
          >
            Individual Tickets
          </Link>
          <Link
            className="button secondary"
            href="/admin/events/checkins"
          >
            Check-ins
          </Link>
        </div>
      </div>

      <Notice
        invited={invited}
        complimentary={complimentary}
        revoked={revoked}
        error={error}
      />

      {data.events.length ? (
        <form
          method="get"
          className="panel live-admin-form mobile-admin-form"
        >
          <label className="full">
            Event
            <select
              name="event_id"
              defaultValue={
                selected?.id ?? ''
              }
            >
              {data.events.map(
                (event) => (
                  <option
                    key={event.id}
                    value={event.id}
                  >
                    {event.title} —{' '}
                    {humanize(
                      event.access_type,
                    )}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="full">
            <button
              className="button secondary"
              type="submit"
            >
              Load Event
            </button>
          </div>
        </form>
      ) : null}

      {selected ? (
        <>
          <div className="v2-admin-stats mobile-admin-stats">
            <article>
              <span>Confirmed no-payment</span>
              <strong>
                {data.counts.confirmed}
              </strong>
              <small>Selected event</small>
            </article>

            <article>
              <span>Free registrations</span>
              <strong>
                {data.counts.free}
              </strong>
              <small>Confirmed</small>
            </article>

            <article>
              <span>Invitations claimed</span>
              <strong>
                {data.counts.invitation}
              </strong>
              <small>Confirmed</small>
            </article>

            <article>
              <span>Complimentary</span>
              <strong>
                {data.counts.complimentary}
              </strong>
              <small>Staff-issued</small>
            </article>
          </div>

          {selected.access_type ===
          'invitation_only' ? (
            <details className="panel live-create-panel">
              <summary>Create Invitation</summary>

              <form
                action={createEventInvitation}
                className="live-admin-form mobile-admin-form"
              >
                <input
                  type="hidden"
                  name="event_id"
                  value={selected.id}
                />

                <label>
                  Access tier
                  <select
                    name="ticket_type_id"
                    required
                  >
                    <option value="">
                      Select tier
                    </option>
                    {data.ticketTypes.map(
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
                  Guest name
                  <input
                    name="invitee_name"
                    required
                  />
                </label>

                <label>
                  Email
                  <input
                    name="invitee_email"
                    type="email"
                  />
                </label>

                <label>
                  Phone
                  <input name="invitee_phone" />
                </label>

                <label>
                  Quantity
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </label>

                <label>
                  Invitation expiry
                  <input
                    name="expires_at"
                    type="datetime-local"
                  />
                </label>

                <label className="full">
                  Internal note
                  <textarea
                    name="note"
                    rows={2}
                  />
                </label>

                <div className="full">
                  <button
                    className="button"
                    type="submit"
                  >
                    Create Invitation
                  </button>
                </div>
              </form>
            </details>
          ) : (
            <div className="live-empty-copy">
              Invitation creation is
              available when this event
              is set to Invitation Only.
            </div>
          )}

          <details className="panel live-create-panel">
            <summary>
              Issue Complimentary Admission
            </summary>

            <form
              action={issueComplimentaryAdmission}
              className="live-admin-form mobile-admin-form"
            >
              <input
                type="hidden"
                name="event_id"
                value={selected.id}
              />

              <label>
                Access tier
                <select
                  name="ticket_type_id"
                  required
                >
                  <option value="">
                    Select tier
                  </option>
                  {data.ticketTypes.map(
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
                Guest name
                <input
                  name="guest_name"
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="guest_email"
                  type="email"
                />
              </label>

              <label>
                Phone
                <input name="guest_phone" />
              </label>

              <label>
                Quantity
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                />
              </label>

              <label className="full">
                Reason
                <textarea
                  name="reason"
                  rows={2}
                  required
                  placeholder="Why is this complimentary access being issued?"
                />
              </label>

              <div className="full">
                <button
                  className="button"
                  type="submit"
                >
                  Issue Complimentary Tickets
                </button>
              </div>
            </form>
          </details>

          <section className="panel v2-admin-table-panel">
            <div className="v2-admin-table-toolbar">
              <div>
                <h2>Invitations</h2>
                <span className="live-data-badge">
                  {data.invitations.length}{' '}
                  SHOWN
                </span>
              </div>
            </div>

            <div className="live-table-wrap mobile-table-wrap">
              <table className="live-admin-table">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Tier</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Expires</th>
                    <th>Claim</th>
                    <th>Manage</th>
                  </tr>
                </thead>

                <tbody>
                  {data.invitations.map(
                    (invitation) => {
                      const effectiveStatus =
                        invitation.status ===
                          'pending' &&
                        invitation.expires_at &&
                        new Date(
                          invitation.expires_at,
                        ).getTime() <
                          Date.now()
                          ? 'expired'
                          : invitation.status

                      return (
                        <tr
                          key={invitation.id}
                        >
                          <td>
                            <strong>
                              {invitation.invitee_name}
                            </strong>
                            <small>
                              {invitation.invitee_email ||
                                invitation.invitee_phone ||
                                'No contact'}
                            </small>
                          </td>

                          <td>
                            {ticketTypeMap.get(
                              invitation.ticket_type_id,
                            ) ?? '—'}
                          </td>

                          <td>
                            {invitation.quantity}
                          </td>

                          <td>
                            {humanize(
                              effectiveStatus,
                            )}
                          </td>

                          <td>
                            {dateTime(
                              invitation.expires_at,
                            )}
                          </td>

                          <td>
                            <Link
                              className="text-button"
                              href={`/events/${selected.slug}/invite/${invitation.invite_token}`}
                              target="_blank"
                            >
                              Open claim
                            </Link>
                          </td>

                          <td>
                            {effectiveStatus ===
                            'pending' ? (
                              <form
                                action={revokeEventInvitation}
                              >
                                <input
                                  type="hidden"
                                  name="invitation_id"
                                  value={invitation.id}
                                />
                                <button
                                  className="button secondary compact"
                                  type="submit"
                                >
                                  Revoke
                                </button>
                              </form>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        </tr>
                      )
                    },
                  )}

                  {!data.invitations.length ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="live-empty-state compact">
                          <strong>
                            No invitations created
                            for this event.
                          </strong>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="live-empty-state">
          <strong>
            No accessible events found.
          </strong>
        </div>
      )}
    </div>
  )
}
