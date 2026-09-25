import Link from 'next/link'
import {
  getEventSalesDashboardData,
  type EventSalesFilters,
} from '@/lib/ticketing/event-sales-data'

function money(amount: number, currency: string) {
  return `${
    currency === 'SLE' ? 'NLe' : currency
  } ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function dateTime(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

function humanize(value?: string | null) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    )
}

function paymentMethodLabel(value?: string | null) {
  if (value === 'in-app') return 'Vult App'
  if (value === 'momo') return 'Mobile Money'
  if (value === 'card') return 'Card'
  return 'Unknown'
}

function salesHref(
  filters: {
    event_id: string
    from: string
    to: string
    status: string
    method: string
  },
  page: number,
) {
  const params = new URLSearchParams()

  if (filters.event_id) {
    params.set('event_id', filters.event_id)
  }
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.status) {
    params.set('status', filters.status)
  }
  if (filters.method) {
    params.set('method', filters.method)
  }
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return query
    ? `/admin/events/sales?${query}`
    : '/admin/events/sales'
}

function exportHref(filters: {
  event_id: string
  from: string
  to: string
  status: string
  method: string
}) {
  const params = new URLSearchParams()

  params.set('event_id', filters.event_id)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.status) {
    params.set('status', filters.status)
  }
  if (filters.method) {
    params.set('method', filters.method)
  }

  return `/api/admin/events/sales/export?${params.toString()}`
}

export async function EventSalesLivePage({
  filters,
}: {
  filters: EventSalesFilters
}) {
  const data = await getEventSalesDashboardData(filters)

  if (!data.selectedEvent) {
    return (
      <div className="portal-content v2-admin-page mobile-admin-page">
        <div className="v2-admin-page-head">
          <div>
            <span className="v2-admin-eyebrow">
              Events / Sales Dashboard
            </span>
            <h1>Event Sales Dashboard</h1>
            <p>
              Revenue, admissions, ticket issuance and check-ins
              for events you are authorized to manage.
            </p>
          </div>
        </div>

        <section className="panel">
          <div className="live-empty-state">
            <strong>No accessible events found.</strong>
            <p>
              You need event-management access to at least one
              event, or global Finance access, to view event
              sales reporting.
            </p>
          </div>
        </section>
      </div>
    )
  }

  const event = data.selectedEvent
  const filtered =
    Boolean(data.filters.from) ||
    Boolean(data.filters.to) ||
    Boolean(data.filters.status) ||
    Boolean(data.filters.method)

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Events / Sales Dashboard
          </span>
          <h1>Event Sales Dashboard</h1>
          <p>
            Payment-backed sales reporting with current admissions,
            ticket issuance and check-in status.
          </p>
        </div>

        <div className="v2-admin-page-actions">
          <Link
            className="button secondary"
            href="/admin/events"
          >
            Events
          </Link>
          <Link
            className="button secondary"
            href="/admin/events/orders"
          >
            Orders
          </Link>
          <a
            className="button"
            href={exportHref(data.filters)}
          >
            Export CSV
          </a>
        </div>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Selected event
            </span>
            <h2>{event.title}</h2>
          </div>
        </div>

        <p className="live-empty-copy">
          {event.venue || 'Venue not set'} ·{' '}
          {dateTime(event.starts_at)} ·{' '}
          {humanize(event.access_type)} ·{' '}
          {humanize(event.status)}
        </p>
      </section>

      <form
        className="panel live-admin-form mobile-admin-form"
        method="get"
      >
        <label className="full">
          Event
          <select
            name="event_id"
            defaultValue={data.filters.event_id}
            required
          >
            {data.events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          From payment/refund date
          <input
            name="from"
            type="date"
            defaultValue={data.filters.from}
          />
        </label>

        <label>
          To payment/refund date
          <input
            name="to"
            type="date"
            defaultValue={data.filters.to}
          />
        </label>

        <label>
          Payment status
          <select
            name="status"
            defaultValue={data.filters.status}
          >
            <option value="">All settled history</option>
            <option value="succeeded">Succeeded</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">
              Partially Refunded
            </option>
            <option value="reversed">Reversed</option>
          </select>
        </label>

        <label>
          Payment method
          <select
            name="method"
            defaultValue={data.filters.method}
          >
            <option value="">All methods</option>
            <option value="in-app">Vult App</option>
            <option value="momo">Mobile Money</option>
            <option value="card">Card</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <div className="full v2-admin-page-actions">
          <button className="button" type="submit">
            Apply filters
          </button>

          <Link
            className="button secondary"
            href={`/admin/events/sales?event_id=${encodeURIComponent(
              event.id,
            )}`}
          >
            Clear filters
          </Link>
        </div>
      </form>

      {filtered ? (
        <div className="live-form-message">
          Revenue, paid-order and admissions-sold figures below
          follow the selected sales filters. Active tickets,
          check-ins, reserved admissions and capacity are current
          event-wide operational figures.
        </div>
      ) : null}

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Paid orders</span>
          <strong>
            {data.paidOrderCount.toLocaleString()}
          </strong>
          <small>Filtered settled sales</small>
        </article>

        <article>
          <span>Admissions sold</span>
          <strong>
            {data.admissionsSold.toLocaleString()}
          </strong>
          <small>Filtered paid admissions</small>
        </article>

        <article>
          <span>Active tickets</span>
          <strong>
            {data.activeTickets.toLocaleString()}
          </strong>
          <small>Current issued admissions</small>
        </article>

        <article>
          <span>Check-ins</span>
          <strong>
            {data.checkinCount.toLocaleString()}
          </strong>
          <small>Current event check-ins</small>
        </article>

        <article>
          <span>Reserved admissions</span>
          <strong>
            {data.reservedAdmissions.toLocaleString()}
          </strong>
          <small>Paid, confirmed + live holds</small>
        </article>

        <article>
          <span>Remaining capacity</span>
          <strong>
            {data.remainingCapacity == null
              ? 'Unlimited'
              : data.remainingCapacity.toLocaleString()}
          </strong>
          <small>Current event capacity</small>
        </article>

        <article>
          <span>Refund records</span>
          <strong>
            {data.refundCount.toLocaleString()}
          </strong>
          <small>Successful refunds in filter period</small>
        </article>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Revenue
            </span>
            <h2>Gross, refunds and net</h2>
          </div>
        </div>

        {data.revenueByCurrency.length ? (
          <div className="v2-admin-stats mobile-admin-stats">
            {data.revenueByCurrency.map((row) => (
              <article key={row.currency}>
                <span>{row.currency}</span>
                <strong>
                  {money(row.net, row.currency)}
                </strong>
                <small>
                  Gross {money(row.gross, row.currency)} · Refunds{' '}
                  {money(row.refunds, row.currency)}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="live-empty-state compact">
            <strong>No settled sales in this filter.</strong>
          </div>
        )}
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Collections by payment method</h2>
            <span className="live-data-badge">
              VULT APP · MOBILE MONEY · CARD
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Payments</th>
                <th>Refunds</th>
                <th>Gross</th>
                <th>Refunded</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {data.methodBreakdown.map((row) => (
                <tr
                  key={`${row.payment_method}:${row.currency}`}
                >
                  <td>
                    {paymentMethodLabel(row.payment_method)}
                  </td>
                  <td>{row.payment_count.toLocaleString()}</td>
                  <td>{row.refund_count.toLocaleString()}</td>
                  <td>{money(row.gross, row.currency)}</td>
                  <td>{money(row.refunds, row.currency)}</td>
                  <td>
                    <strong>
                      {money(row.net, row.currency)}
                    </strong>
                  </td>
                </tr>
              ))}

              {!data.methodBreakdown.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="live-empty-state compact">
                      <strong>
                        No payment-method activity in this filter.
                      </strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Ticket type performance</h2>
            <span className="live-data-badge">
              FILTERED PAID SALES
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Ticket type</th>
                <th>Units</th>
                <th>Admissions</th>
                <th>Gross</th>
              </tr>
            </thead>
            <tbody>
              {data.ticketTypeBreakdown.map((row) => (
                <tr
                  key={`${row.ticket_type_id}:${row.currency}`}
                >
                  <td>{row.ticket_type_name}</td>
                  <td>{row.units.toLocaleString()}</td>
                  <td>{row.admissions.toLocaleString()}</td>
                  <td>{money(row.gross, row.currency)}</td>
                </tr>
              ))}

              {!data.ticketTypeBreakdown.length ? (
                <tr>
                  <td colSpan={4}>
                    <div className="live-empty-state compact">
                      <strong>No ticket sales in this filter.</strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Current confirmed admissions by access</h2>
            <span className="live-data-badge">
              EVENT-WIDE CURRENT STATE
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Access source</th>
                <th>Admissions</th>
              </tr>
            </thead>
            <tbody>
              {data.accessBreakdown.map((row) => (
                <tr key={row.source_type}>
                  <td>{humanize(row.source_type)}</td>
                  <td>{row.admissions.toLocaleString()}</td>
                </tr>
              ))}

              {!data.accessBreakdown.length ? (
                <tr>
                  <td colSpan={2}>
                    <div className="live-empty-state compact">
                      <strong>
                        No confirmed admissions yet.
                      </strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Sales records</h2>
            <span className="live-data-badge">
              {data.totalCount.toLocaleString()} RECORDS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Purchaser</th>
                <th>Ticket</th>
                <th>Admissions</th>
                <th>Method</th>
                <th>Gross</th>
                <th>Current refund</th>
                <th>Current net</th>
                <th>Status</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.map((sale) => (
                <tr key={sale.payment_id}>
                  <td>
                    <strong>{sale.order_number}</strong>
                    <small>{sale.payment_id}</small>
                  </td>
                  <td>
                    <strong>{sale.purchaser_name}</strong>
                    <small>
                      {sale.purchaser_email ||
                        sale.purchaser_phone ||
                        '—'}
                    </small>
                  </td>
                  <td>
                    <strong>{sale.ticket_types}</strong>
                    <small>
                      {sale.units.toLocaleString()} unit(s)
                    </small>
                  </td>
                  <td>{sale.admissions.toLocaleString()}</td>
                  <td>
                    {paymentMethodLabel(sale.payment_method)}
                  </td>
                  <td>
                    {money(sale.gross_amount, sale.currency)}
                  </td>
                  <td>
                    {money(sale.refund_amount, sale.currency)}
                  </td>
                  <td>
                    <strong>
                      {money(sale.current_net, sale.currency)}
                    </strong>
                  </td>
                  <td>
                    <strong>
                      {humanize(sale.payment_status)}
                    </strong>
                    <small>
                      Order {humanize(sale.order_status)}
                    </small>
                  </td>
                  <td>{dateTime(sale.paid_at)}</td>
                </tr>
              ))}

              {!data.sales.length ? (
                <tr>
                  <td colSpan={10}>
                    <div className="live-empty-state compact">
                      <strong>
                        No sales records match these filters.
                      </strong>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {data.totalPages > 1 ? (
          <div className="v2-admin-page-actions">
            {data.page > 1 ? (
              <Link
                className="button secondary"
                href={salesHref(
                  data.filters,
                  data.page - 1,
                )}
              >
                Previous
              </Link>
            ) : null}

            <span className="live-data-badge">
              PAGE {data.page} OF {data.totalPages}
            </span>

            {data.page < data.totalPages ? (
              <Link
                className="button secondary"
                href={salesHref(
                  data.filters,
                  data.page + 1,
                )}
              >
                Next
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
