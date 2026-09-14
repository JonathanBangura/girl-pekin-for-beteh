import Link from 'next/link'
import { getAdminTicketsData } from '@/lib/ticketing/admin-tickets-data'

function humanize(value?: string | null) {
  if (!value) return '—'
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function dateTime(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

function ticketTone(status: string) {
  if (status === 'active') return 'teal'
  if (status === 'refunded') return 'coral'
  return ''
}

export async function IndividualTicketsManagementLivePage({
  eventId,
  status,
}: {
  eventId?: string
  status?: string
}) {
  const data = await getAdminTicketsData({
    eventId,
    status,
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
            Events / Individual Tickets
          </span>
          <h1>Tickets</h1>
          <p>
            One record per issued admission. QR token hashes
            and payment credentials are intentionally not
            displayed here.
          </p>
        </div>

        <Link
          className="button secondary"
          href="/admin/events/checkins"
        >
          Check-ins
        </Link>
      </div>

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Issued tickets</span>
          <strong>{data.counts.total}</strong>
          <small>Selected event scope</small>
        </article>

        <article>
          <span>Active</span>
          <strong>{data.counts.active}</strong>
          <small>Valid admissions</small>
        </article>

        <article>
          <span>Checked in</span>
          <strong>{data.counts.checkedIn}</strong>
          <small>One-time check-ins</small>
        </article>

        <article>
          <span>Inactive</span>
          <strong>{inactive}</strong>
          <small>
            Cancelled, refunded or reissued
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
            defaultValue={data.selectedEventId}
          >
            <option value="">All accessible events</option>
            {data.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ticket status
          <select
            name="status"
            defaultValue={data.selectedStatus}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
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

        <div className="full v2-admin-page-actions">
          <button className="button" type="submit">
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
            <h2>Issued admissions</h2>
            <span className="live-data-badge">
              {data.tickets.length} SHOWN
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
                <th>Holder</th>
                <th>Status</th>
                <th>Admission</th>
                <th>Check-in</th>
                <th>Issued</th>
              </tr>
            </thead>

            <tbody>
              {data.tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <strong>{ticket.ticket_code}</strong>
                    <small>
                      {ticket.id.slice(0, 8)}
                    </small>
                  </td>

                  <td>
                    <strong>
                      {ticket.event?.title ?? '—'}
                    </strong>
                    <small>
                      {ticket.event?.slug ?? ''}
                    </small>
                  </td>

                  <td>
                    {ticket.item?.ticket_type_name ??
                      'Event Ticket'}
                  </td>

                  <td>
                    <strong>
                      {ticket.order?.order_number ?? '—'}
                    </strong>
                    <small>
                      {humanize(
                        ticket.order?.status,
                      )}
                    </small>
                  </td>

                  <td>
                    {ticket.holder_name || '—'}
                  </td>

                  <td>
                    <span
                      className={`pill ${ticketTone(
                        ticket.status,
                      )}`}
                    >
                      {humanize(ticket.status)}
                    </span>
                  </td>

                  <td>
                    #{ticket.admission_sequence}
                  </td>

                  <td>
                    {ticket.checkin ? (
                      <>
                        <strong>Checked in</strong>
                        <small>
                          {dateTime(
                            ticket.checkin
                              .checked_in_at,
                          )}
                        </small>
                      </>
                    ) : (
                      <span>Not used</span>
                    )}
                  </td>

                  <td>
                    {dateTime(ticket.issued_at)}
                  </td>
                </tr>
              ))}

              {!data.tickets.length ? (
                <tr>
                  <td colSpan={9}>
                    <div className="live-empty-state compact">
                      <strong>
                        No issued tickets match this
                        filter.
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
        Up to the latest 200 ticket records are shown.
        Use event and status filters to narrow the
        operational view.
      </p>
    </div>
  )
}
