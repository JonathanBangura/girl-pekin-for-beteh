import Link from 'next/link'
import { saveEvent } from '@/lib/admin/event-actions'
import { getAdminEventsData } from '@/lib/ticketing/live-data'

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    )
}

function dateTime(value?: string | null) {
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

function toLocalInput(
  value?: string | null,
) {
  if (!value) return ''

  const date = new Date(value)
  const pad = (number: number) =>
    String(number).padStart(2, '0')

  return `${date.getUTCFullYear()}-${pad(
    date.getUTCMonth() + 1,
  )}-${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}:${pad(date.getUTCMinutes())}`
}

function Notice({
  saved,
  error,
}: {
  saved?: string
  error?: string
}) {
  if (saved === '1') {
    return (
      <div className="live-form-message success">
        Event saved successfully.
      </div>
    )
  }

  if (!error) return null

  const messages: Record<
    string,
    string
  > = {
    missing_title:
      'Event title is required.',
    invalid_fields:
      'Review the date/time and numeric fields.',
    invalid_window:
      'Event end must be later than event start.',
    invalid_capacity:
      'Capacity must be zero or greater.',
    invalid_access:
      'Select a valid event access type.',
    invalid_status:
      'Select a valid event status.',
    invalid_slug:
      'Enter a valid event title or slug.',
    not_found:
      'That event could not be found or is not available to you.',
    '23505':
      'Another event already uses that slug.',
  }

  return (
    <div className="live-form-message error">
      {messages[error] ||
        'The event could not be saved. Review the details and try again.'}
    </div>
  )
}

const accessOptions = [
  ['open', 'Open / No Registration'],
  [
    'free_registration',
    'Free Registration',
  ],
  ['paid', 'Paid Tickets'],
  [
    'invitation_only',
    'Invitation Only',
  ],
] as const

const statusOptions = [
  ['draft', 'Draft'],
  ['published', 'Published'],
  ['sales_closed', 'Sales Closed'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['archived', 'Archived'],
] as const

export async function EventsManagementLivePage({
  saved,
  error,
}: {
  saved?: string
  error?: string
}) {
  const data =
    await getAdminEventsData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Events Management
          </span>
          <h1>Events</h1>
          <p>
            Manage event identity,
            schedule, access mode,
            publication and capacity.
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
            href="/admin/events/ticket-types"
          >
            Ticket Types
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
        saved={saved}
        error={error}
      />

      {data.canCreateEvent ? (
        <details className="panel live-create-panel">
          <summary>Create Event</summary>

          <form
            action={saveEvent}
            className="live-admin-form mobile-admin-form"
          >
            <label>
              Event title
              <input
                name="title"
                required
                placeholder="Official event title"
              />
            </label>

            <label>
              URL slug
              <input
                name="slug"
                placeholder="Leave blank to generate from title"
              />
            </label>

            <label className="full">
              Summary
              <textarea
                name="summary"
                rows={2}
              />
            </label>

            <label className="full">
              Description
              <textarea
                name="description"
                rows={4}
              />
            </label>

            <label>
              Venue
              <input name="venue" />
            </label>

            <label>
              Capacity
              <input
                name="capacity"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Blank = unlimited"
              />
            </label>

            <label>
              Starts
              <input
                name="starts_at"
                type="datetime-local"
              />
            </label>

            <label>
              Ends
              <input
                name="ends_at"
                type="datetime-local"
              />
            </label>

            <label>
              Access type
              <select
                name="access_type"
                defaultValue="open"
              >
                {accessOptions.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Status
              <select
                name="status"
                defaultValue="draft"
              >
                {statusOptions.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="full">
              Cover image URL
              <input
                name="cover_image_url"
                type="url"
                placeholder="Optional public image URL"
              />
            </label>

            <label className="live-check">
              <input
                name="is_public"
                type="checkbox"
              />
              Public event
            </label>

            <div className="full">
              <button
                className="button"
                type="submit"
              >
                Create Event
              </button>
            </div>
          </form>
        </details>
      ) : data.canManageEvents ? (
        <div className="live-empty-copy">
          Your Event Manager role is
          scoped to existing event
          records. A global Event
          Manager or Super Admin creates
          new events; you can manage
          assigned events below.
        </div>
      ) : null}

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Events</span>
          <strong>
            {data.events.length}
          </strong>
          <small>
            Accessible records
          </small>
        </article>

        <article>
          <span>Ticket orders</span>
          <strong>
            {data.counts.ticketOrders}
          </strong>
          <small>All statuses</small>
        </article>

        <article>
          <span>Paid orders</span>
          <strong>
            {data.counts.paidOrders}
          </strong>
          <small>
            Successful orders
          </small>
        </article>

        <article>
          <span>Active tickets</span>
          <strong>
            {data.counts.activeTickets}
          </strong>
          <small>
            Issued admissions
          </small>
        </article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Event records</h2>
            <span className="live-data-badge">
              LIVE DATA
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Access</th>
                <th>Status</th>
                <th>Visibility</th>
                <th>Ticket types</th>
                <th>Capacity</th>
                <th>Manage</th>
              </tr>
            </thead>

            <tbody>
              {data.events.map(
                (event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>
                        {event.title}
                      </strong>
                      <small>
                        {event.venue ||
                          event.slug}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {dateTime(
                          event.starts_at,
                        )}
                      </strong>
                      {event.ends_at ? (
                        <small>
                          to{' '}
                          {dateTime(
                            event.ends_at,
                          )}
                        </small>
                      ) : null}
                    </td>

                    <td>
                      {humanize(
                        event.access_type,
                      )}
                    </td>

                    <td>
                      {humanize(
                        event.status,
                      )}
                    </td>

                    <td>
                      {event.is_public
                        ? 'Public'
                        : 'Private'}
                    </td>

                    <td>
                      {
                        event.ticket_type_count
                      }
                    </td>

                    <td>
                      {event.capacity ??
                        'Unlimited'}
                    </td>

                    <td>
                      {data.canManageEvents ? (
                        <details className="live-row-editor wide mobile-row-editor">
                          <summary>
                            Edit
                          </summary>

                          <form
                            action={
                              saveEvent
                            }
                            className="live-row-form mobile-row-form"
                          >
                            <input
                              type="hidden"
                              name="event_id"
                              value={
                                event.id
                              }
                            />

                            <label>
                              Event title
                              <input
                                name="title"
                                defaultValue={
                                  event.title
                                }
                                required
                              />
                            </label>

                            <label>
                              URL slug
                              <input
                                name="slug"
                                defaultValue={
                                  event.slug
                                }
                                required
                              />
                            </label>

                            <label className="full">
                              Summary
                              <textarea
                                name="summary"
                                rows={2}
                                defaultValue={
                                  event.summary ??
                                  ''
                                }
                              />
                            </label>

                            <label className="full">
                              Description
                              <textarea
                                name="description"
                                rows={4}
                                defaultValue={
                                  event.description ??
                                  ''
                                }
                              />
                            </label>

                            <label>
                              Venue
                              <input
                                name="venue"
                                defaultValue={
                                  event.venue ??
                                  ''
                                }
                              />
                            </label>

                            <label>
                              Capacity
                              <input
                                name="capacity"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                defaultValue={
                                  event.capacity ??
                                  ''
                                }
                              />
                            </label>

                            <label>
                              Starts
                              <input
                                name="starts_at"
                                type="datetime-local"
                                defaultValue={toLocalInput(
                                  event.starts_at,
                                )}
                              />
                            </label>

                            <label>
                              Ends
                              <input
                                name="ends_at"
                                type="datetime-local"
                                defaultValue={toLocalInput(
                                  event.ends_at,
                                )}
                              />
                            </label>

                            <label>
                              Access type
                              <select
                                name="access_type"
                                defaultValue={
                                  event.access_type
                                }
                              >
                                {accessOptions.map(
                                  ([
                                    value,
                                    label,
                                  ]) => (
                                    <option
                                      key={
                                        value
                                      }
                                      value={
                                        value
                                      }
                                    >
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>

                            <label>
                              Status
                              <select
                                name="status"
                                defaultValue={
                                  event.status
                                }
                              >
                                {statusOptions.map(
                                  ([
                                    value,
                                    label,
                                  ]) => (
                                    <option
                                      key={
                                        value
                                      }
                                      value={
                                        value
                                      }
                                    >
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>

                            <label className="full">
                              Cover image URL
                              <input
                                name="cover_image_url"
                                type="url"
                                defaultValue={
                                  event.cover_image_url ??
                                  ''
                                }
                              />
                            </label>

                            <label className="live-check">
                              <input
                                name="is_public"
                                type="checkbox"
                                defaultChecked={
                                  event.is_public
                                }
                              />
                              Public event
                            </label>

                            <button
                              className="button compact"
                              type="submit"
                            >
                              Save changes
                            </button>
                          </form>
                        </details>
                      ) : (
                        <span>
                          Read only
                        </span>
                      )}
                    </td>
                  </tr>
                ),
              )}

              {!data.events.length ? (
                <tr>
                  <td colSpan={8}>
                    <div className="live-empty-state compact">
                      <strong>
                        No accessible
                        events found.
                      </strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
