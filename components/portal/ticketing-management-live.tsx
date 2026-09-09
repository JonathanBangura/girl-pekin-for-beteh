import { saveTicketType } from '@/lib/admin/ticketing-actions'
import {
  getAdminEventsData,
  getAdminTicketOrdersData,
} from '@/lib/ticketing/live-data'

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function money(value: unknown, currency = 'SLE') {
  const amount = Number(value ?? 0)
  return `${currency === 'SLE' ? 'NLe' : currency} ${amount.toLocaleString()}`
}

function dateTime(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toLocalInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
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
        Ticket type saved successfully.
      </div>
    )
  }

  if (error) {
    return (
      <div className="live-form-message error">
        The ticket configuration could not be saved. Please review the fields
        and try again.
      </div>
    )
  }

  return null
}

export async function EventsManagementLivePage() {
  const data = await getAdminEventsData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Events Management</span>
          <h1>Events</h1>
          <p>
            Live event, ticketing and admission data from Supabase.
          </p>
        </div>
      </div>

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Events</span>
          <strong>{data.events.length}</strong>
          <small>Live records</small>
        </article>
        <article>
          <span>Ticket orders</span>
          <strong>{data.counts.ticketOrders}</strong>
          <small>All statuses</small>
        </article>
        <article>
          <span>Paid orders</span>
          <strong>{data.counts.paidOrders}</strong>
          <small>Successful orders</small>
        </article>
        <article>
          <span>Active tickets</span>
          <strong>{data.counts.activeTickets}</strong>
          <small>Issued admissions</small>
        </article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Event records</h2>
            <span className="live-data-badge">LIVE DATA</span>
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
                <th>Ticket types</th>
                <th>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <strong>{event.title}</strong>
                    <small>{event.venue || event.slug}</small>
                  </td>
                  <td>{dateTime(event.starts_at)}</td>
                  <td>{humanize(event.access_type)}</td>
                  <td>{humanize(event.status)}</td>
                  <td>{event.ticket_type_count}</td>
                  <td>{event.capacity ?? 'Unlimited'}</td>
                </tr>
              ))}

              {!data.events.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="live-empty-state compact">
                      <strong>No events found.</strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export async function TicketTypesManagementLivePage({
  saved,
  error,
}: {
  saved?: string
  error?: string
}) {
  const data = await getAdminEventsData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Events / Ticket Types</span>
          <h1>Ticket Types</h1>
          <p>
            Configure fixed-price, donation and free ticket types with
            capacity and per-order controls.
          </p>
        </div>
      </div>

      <Notice saved={saved} error={error} />

      <details className="panel live-create-panel">
        <summary>Add Ticket Type</summary>

        <form action={saveTicketType} className="live-admin-form mobile-admin-form">
          <label>
            Event
            <select name="event_id" required>
              <option value="">Select event</option>
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ticket name
            <input name="name" required />
          </label>

          <label>
            Pricing type
            <select name="pricing_type" defaultValue="fixed">
              <option value="fixed">Fixed</option>
              <option value="donation">Donation</option>
              <option value="free">Free</option>
            </select>
          </label>

          <label>
            Currency
            <input name="currency" defaultValue="SLE" required />
          </label>

          <label>
            Fixed price
            <input name="price" type="number" min="0" step="0.01" />
          </label>

          <label>
            Minimum donation
            <input
              name="min_donation"
              type="number"
              min="0"
              step="0.01"
            />
          </label>

          <label>
            Capacity
            <input name="capacity" type="number" min="0" />
          </label>

          <label>
            Max per order
            <input name="max_per_order" type="number" min="1" />
          </label>

          <label>
            Admissions per unit
            <input
              name="admissions_per_unit"
              type="number"
              min="1"
              defaultValue="1"
              required
            />
          </label>

          <label>
            Display order
            <input name="sort_order" type="number" defaultValue="0" />
          </label>

          <label>
            Sales start
            <input name="sales_starts_at" type="datetime-local" />
          </label>

          <label>
            Sales end
            <input name="sales_ends_at" type="datetime-local" />
          </label>

          <label className="full">
            Description
            <textarea name="description" rows={3} />
          </label>

          <label className="live-check">
            <input name="is_active" type="checkbox" defaultChecked />
            Active
          </label>

          <div className="full">
            <button className="button" type="submit">
              Save Ticket Type
            </button>
          </div>
        </form>
      </details>

      <section className="panel v2-admin-table-panel">
        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Ticket Type</th>
                <th>Event</th>
                <th>Pricing</th>
                <th>Capacity</th>
                <th>Max / Order</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.ticketTypes.map((type) => {
                const event = data.events.find(
                  (item) => item.id === type.event_id,
                )

                return (
                  <tr key={type.id}>
                    <td>
                      <strong>{type.name}</strong>
                      <small>
                        {type.admissions_per_unit} admission
                        {type.admissions_per_unit === 1 ? '' : 's'} per unit
                      </small>
                    </td>
                    <td>{event?.title ?? '—'}</td>
                    <td>
                      {type.pricing_type === 'fixed'
                        ? money(type.price, type.currency)
                        : type.pricing_type === 'donation'
                          ? `Donation${type.min_donation ? ` · min ${money(type.min_donation, type.currency)}` : ''}`
                          : 'Free'}
                    </td>
                    <td>{type.capacity ?? 'Unlimited'}</td>
                    <td>{type.max_per_order ?? '—'}</td>
                    <td>{type.is_active ? 'Active' : 'Inactive'}</td>
                    <td>
                      <details className="live-row-editor wide mobile-row-editor">
                        <summary>Edit</summary>

                        <form
                          action={saveTicketType}
                          className="live-row-form mobile-row-form"
                        >
                          <input
                            type="hidden"
                            name="ticket_type_id"
                            value={type.id}
                          />

                          <input
                            type="hidden"
                            name="event_id"
                            value={type.event_id}
                          />

                          <label>
                            Name
                            <input
                              name="name"
                              defaultValue={type.name}
                              required
                            />
                          </label>

                          <label>
                            Pricing type
                            <select
                              name="pricing_type"
                              defaultValue={type.pricing_type}
                            >
                              <option value="fixed">Fixed</option>
                              <option value="donation">Donation</option>
                              <option value="free">Free</option>
                            </select>
                          </label>

                          <label>
                            Currency
                            <input
                              name="currency"
                              defaultValue={type.currency}
                              required
                            />
                          </label>

                          <label>
                            Fixed price
                            <input
                              name="price"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={type.price ?? ''}
                            />
                          </label>

                          <label>
                            Minimum donation
                            <input
                              name="min_donation"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={type.min_donation ?? ''}
                            />
                          </label>

                          <label>
                            Capacity
                            <input
                              name="capacity"
                              type="number"
                              min="0"
                              defaultValue={type.capacity ?? ''}
                            />
                          </label>

                          <label>
                            Max per order
                            <input
                              name="max_per_order"
                              type="number"
                              min="1"
                              defaultValue={type.max_per_order ?? ''}
                            />
                          </label>

                          <label>
                            Admissions per unit
                            <input
                              name="admissions_per_unit"
                              type="number"
                              min="1"
                              defaultValue={type.admissions_per_unit}
                            />
                          </label>

                          <label>
                            Sales start
                            <input
                              name="sales_starts_at"
                              type="datetime-local"
                              defaultValue={toLocalInput(
                                type.sales_starts_at,
                              )}
                            />
                          </label>

                          <label>
                            Sales end
                            <input
                              name="sales_ends_at"
                              type="datetime-local"
                              defaultValue={toLocalInput(
                                type.sales_ends_at,
                              )}
                            />
                          </label>

                          <label>
                            Display order
                            <input
                              name="sort_order"
                              type="number"
                              defaultValue={type.sort_order}
                            />
                          </label>

                          <label className="live-check">
                            <input
                              name="is_active"
                              type="checkbox"
                              defaultChecked={type.is_active}
                            />
                            Active
                          </label>

                          <button className="button compact" type="submit">
                            Save changes
                          </button>
                        </form>
                      </details>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export async function TicketOrdersManagementLivePage() {
  const orders = await getAdminTicketOrdersData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Events / Orders</span>
          <h1>Ticket Orders</h1>
          <p>
            Live ticket-order and payment state. Purchaser details remain
            restricted to authorized staff.
          </p>
        </div>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Event</th>
                <th>Purchaser</th>
                <th>Ticket</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Order</th>
                <th>Payment</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.order_number}</strong></td>
                  <td>{order.event?.title ?? '—'}</td>
                  <td>
                    <strong>{order.purchaser_name}</strong>
                    <small>
                      {order.purchaser_email ||
                        order.purchaser_phone ||
                        '—'}
                    </small>
                  </td>
                  <td>{order.item?.ticket_type_name ?? '—'}</td>
                  <td>{order.item?.quantity ?? '—'}</td>
                  <td>{money(order.total_amount, order.currency)}</td>
                  <td>{humanize(order.status)}</td>
                  <td>
                    {order.payment
                      ? humanize(order.payment.status)
                      : 'No payment'}
                  </td>
                  <td>{dateTime(order.created_at)}</td>
                </tr>
              ))}

              {!orders.length && (
                <tr>
                  <td colSpan={9}>
                    <div className="live-empty-state compact">
                      <strong>No ticket orders yet.</strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
