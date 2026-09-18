import Link from 'next/link'
import {
  cancelTicket,
  reissueTicket,
} from '@/lib/admin/ticket-lifecycle-actions'
import { getAdminTicketsData } from '@/lib/ticketing/admin-tickets-data'

function humanize(
  value?: string | null,
) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase(),
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

function ticketTone(
  status: string,
) {
  if (status === 'active') {
    return 'teal'
  }

  if (
    status === 'refunded' ||
    status === 'cancelled'
  ) {
    return 'coral'
  }

  return ''
}

function Notice({
  cancelled,
  reissued,
  error,
}: {
  cancelled?: string
  reissued?: string
  error?: string
}) {
  if (cancelled === '1') {
    return (
      <div className="live-form-message success">
        Ticket cancelled.
      </div>
    )
  }

  if (reissued === '1') {
    return (
      <div className="live-form-message success">
        Ticket reissued. The old
        QR is invalid and a new
        active ticket was created.
      </div>
    )
  }

  if (!error) return null

  const messages: Record<
    string,
    string
  > = {
    reason_required:
      'A reason is required for cancellation or reissue.',
    checked_in:
      'A ticket that has already been checked in cannot be cancelled or reissued.',
    cancel_failed:
      'The ticket could not be cancelled.',
    reissue_failed:
      'The ticket could not be reissued.',
  }

  return (
    <div className="live-form-message error">
      {messages[error] ||
        'The ticket change could not be completed.'}
    </div>
  )
}

export async function IndividualTicketsManagementLivePage({
  eventId,
  status,
  query,
  cancelled,
  reissued,
  error,
}: {
  eventId?: string
  status?: string
  query?: string
  cancelled?: string
  reissued?: string
  error?: string
}) {
  const data =
    await getAdminTicketsData({
      eventId,
      status,
      query,
    })

  const inactive =
    data.counts.cancelled +
    data.counts.refunded +
    data.counts.reissued

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Events / Individual
            Tickets
          </span>
          <h1>Tickets</h1>
          <p>
            Search, cancel and
            reissue individual
            admissions. QR hashes
            and payment credentials
            remain hidden.
          </p>
        </div>

        <div className="v2-admin-page-actions">
          <Link
            className="button secondary"
            href="/admin/events/access"
          >
            Access & Guests
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
        cancelled={cancelled}
        reissued={reissued}
        error={error}
      />

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>
            Issued tickets
          </span>
          <strong>
            {data.counts.total}
          </strong>
          <small>
            Selected event scope
          </small>
        </article>

        <article>
          <span>Active</span>
          <strong>
            {data.counts.active}
          </strong>
          <small>
            Valid admissions
          </small>
        </article>

        <article>
          <span>
            Checked in
          </span>
          <strong>
            {
              data.counts
                .checkedIn
            }
          </strong>
          <small>
            One-time check-ins
          </small>
        </article>

        <article>
          <span>Inactive</span>
          <strong>
            {inactive}
          </strong>
          <small>
            Cancelled, refunded or
            replaced
          </small>
        </article>
      </div>

      <form
        className="panel live-admin-form mobile-admin-form"
        method="get"
      >
        <label>
          Event
          <select
            name="event_id"
            defaultValue={
              data.selectedEventId
            }
          >
            <option value="">
              All accessible events
            </option>
            {data.events.map(
              (event) => (
                <option
                  key={event.id}
                  value={event.id}
                >
                  {event.title}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Ticket status
          <select
            name="status"
            defaultValue={
              data.selectedStatus
            }
          >
            <option value="">
              All statuses
            </option>
            <option value="active">
              Active
            </option>
            <option value="cancelled">
              Cancelled
            </option>
            <option value="refunded">
              Refunded
            </option>
            <option value="reissued">
              Reissued
            </option>
          </select>
        </label>

        <label className="full">
          Search
          <input
            name="q"
            defaultValue={
              data.query
            }
            placeholder="Ticket code, order number, guest name, email or phone"
          />
        </label>

        <div className="full v2-admin-page-actions">
          <button
            className="button"
            type="submit"
          >
            Apply Filters
          </button>
          <Link
            className="button secondary"
            href="/admin/events/tickets"
          >
            Clear Filters
          </Link>
        </div>
      </form>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>
              Issued admissions
            </h2>
            <span className="live-data-badge">
              {data.tickets.length}{' '}
              SHOWN
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Event</th>
                <th>Tier</th>
                <th>Order</th>
                <th>Guest</th>
                <th>Status</th>
                <th>Admission</th>
                <th>Check-in</th>
                <th>Issued</th>
                <th>Manage</th>
              </tr>
            </thead>

            <tbody>
              {data.tickets.map(
                (ticket) => (
                  <tr
                    key={ticket.id}
                  >
                    <td>
                      <strong>
                        {
                          ticket.ticket_code
                        }
                      </strong>
                      <small>
                        {ticket.id.slice(
                          0,
                          8,
                        )}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {ticket.event
                          ?.title ??
                          '—'}
                      </strong>
                      <small>
                        {ticket.event
                          ?.slug ??
                          ''}
                      </small>
                    </td>

                    <td>
                      {ticket.item
                        ?.ticket_type_name ??
                        'Event Ticket'}
                    </td>

                    <td>
                      <strong>
                        {ticket.order
                          ?.order_number ??
                          '—'}
                      </strong>
                      <small>
                        {humanize(
                          ticket.order
                            ?.source_type,
                        )}{' '}
                        ·{' '}
                        {humanize(
                          ticket.order
                            ?.status,
                        )}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {ticket.holder_name ||
                          ticket.order
                            ?.purchaser_name ||
                          '—'}
                      </strong>
                      <small>
                        {ticket.order
                          ?.purchaser_email ||
                          ticket.order
                            ?.purchaser_phone ||
                          ''}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`pill ${ticketTone(
                          ticket.status,
                        )}`}
                      >
                        {humanize(
                          ticket.status,
                        )}
                      </span>
                    </td>

                    <td>
                      #
                      {
                        ticket.admission_sequence
                      }
                    </td>

                    <td>
                      {ticket.checkin ? (
                        <>
                          <strong>
                            Checked in
                          </strong>
                          <small>
                            {dateTime(
                              ticket
                                .checkin
                                .checked_in_at,
                            )}
                          </small>
                        </>
                      ) : (
                        <span>
                          Not used
                        </span>
                      )}
                    </td>

                    <td>
                      {dateTime(
                        ticket.issued_at,
                      )}
                    </td>

                    <td>
                      {ticket.can_manage &&
                      ticket.status ===
                        'active' &&
                      !ticket.checkin ? (
                        <details className="live-row-editor wide mobile-row-editor">
                          <summary>
                            Actions
                          </summary>

                          <form
                            action={
                              cancelTicket
                            }
                            className="live-row-form mobile-row-form"
                          >
                            <input
                              type="hidden"
                              name="ticket_id"
                              value={
                                ticket.id
                              }
                            />
                            <label className="full">
                              Cancellation
                              reason
                              <textarea
                                name="reason"
                                rows={2}
                                required
                              />
                            </label>
                            <button
                              className="button secondary compact"
                              type="submit"
                            >
                              Cancel Ticket
                            </button>
                          </form>

                          <form
                            action={
                              reissueTicket
                            }
                            className="live-row-form mobile-row-form"
                          >
                            <input
                              type="hidden"
                              name="ticket_id"
                              value={
                                ticket.id
                              }
                            />
                            <label className="full">
                              Reissue
                              reason
                              <textarea
                                name="reason"
                                rows={2}
                                required
                              />
                            </label>
                            <button
                              className="button compact"
                              type="submit"
                            >
                              Reissue Ticket
                            </button>
                          </form>
                        </details>
                      ) : ticket.checkin ? (
                        <span>
                          Locked after
                          check-in
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ),
              )}

              {!data.tickets.length ? (
                <tr>
                  <td colSpan={10}>
                    <div className="live-empty-state compact">
                      <strong>
                        No issued
                        tickets match
                        this filter.
                      </strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="live-empty-copy">
        Up to the latest 200
        matching ticket records are
        shown.
      </p>
    </div>
  )
}
