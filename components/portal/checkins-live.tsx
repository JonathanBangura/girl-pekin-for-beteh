import Link from 'next/link'
import { getAdminCheckinsData } from '@/lib/checkin/data'

function dateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export async function CheckinsLivePage({
  eventId,
}: {
  eventId?: string
}) {
  const data = await getAdminCheckinsData(eventId)

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Events / Check-In</span>
          <h1>Check-In Operations</h1>
          <p>
            Live admission totals and recent successful check-ins by event.
          </p>
        </div>

        <Link className="button" href="/scan">
          Open Scanner
        </Link>
      </div>

      {data.events.length ? (
        <form className="checkin-admin-event-filter" method="get">
          <label>
            Event
            <select
              name="event_id"
              defaultValue={data.selectedEvent?.id ?? ''}
            >
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" type="submit">
            View Event
          </button>
        </form>
      ) : null}

      {data.selectedEvent && data.summary ? (
        <>
          <section className="panel checkin-admin-event-card">
            <div>
              <span className="v2-admin-eyebrow">Selected event</span>
              <h2>{data.selectedEvent.title}</h2>
              <p>
                {dateTime(data.selectedEvent.starts_at)}
                {data.selectedEvent.venue
                  ? ` · ${data.selectedEvent.venue}`
                  : ''}
              </p>
            </div>
          </section>

          <div className="v2-admin-stats mobile-admin-stats">
            <article>
              <span>Issued tickets</span>
              <strong>{data.summary.issued}</strong>
              <small>All statuses</small>
            </article>
            <article>
              <span>Active tickets</span>
              <strong>{data.summary.active}</strong>
              <small>Eligible tickets</small>
            </article>
            <article>
              <span>Checked in</span>
              <strong>{data.summary.checkedIn}</strong>
              <small>Successful admissions</small>
            </article>
            <article>
              <span>Remaining</span>
              <strong>{data.summary.remaining}</strong>
              <small>Active minus checked-in</small>
            </article>
          </div>

          <section className="panel v2-admin-table-panel">
            <div className="v2-admin-table-toolbar">
              <div>
                <h2>Recent check-ins</h2>
                <span className="live-data-badge">LIVE DATA</span>
              </div>
            </div>

            <div className="live-table-wrap mobile-table-wrap">
              <table className="live-admin-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Guest</th>
                    <th>Tier</th>
                    <th>Station</th>
                    <th>Checked in</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.recent.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.ticket_code}</strong></td>
                      <td>{row.holder_name || 'Guest'}</td>
                      <td>{row.ticket_type_name}</td>
                      <td>{row.device_label || '—'}</td>
                      <td>{dateTime(row.checked_in_at)}</td>
                    </tr>
                  ))}

                  {!data.summary.recent.length && (
                    <tr>
                      <td colSpan={5}>
                        <div className="live-empty-state compact">
                          <strong>No check-ins yet.</strong>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="panel live-empty-state">
          <strong>No manageable events found.</strong>
          <p>
            Your account needs Events Manager permission for an event before
            its operational check-in report appears here.
          </p>
        </section>
      )}
    </div>
  )
}
