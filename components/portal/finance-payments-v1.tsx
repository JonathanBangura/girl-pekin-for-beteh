import Link from 'next/link'
import { getFinancePaymentsData } from '@/lib/finance/data'

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

function StatusBadge({
  value,
}: {
  value?: string | null
}) {
  const normalized = value ?? 'unknown'
  const tone =
    normalized === 'succeeded' ||
    normalized === 'paid' ||
    normalized === 'confirmed'
      ? 'teal'
      : normalized === 'failed' ||
          normalized === 'cancelled'
        ? 'coral'
        : ''

  return (
    <span className={`pill ${tone}`}>
      {humanize(normalized)}
    </span>
  )
}

type PaymentsFilters = {
  status?: string
  type?: string
  provider?: string
  method?: string
  q?: string
  page?: string
}

const v1Statuses = new Set([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
])

const v1Types = new Set([
  'vote',
  'ticket',
])

function v1Filters(
  filters: PaymentsFilters,
): PaymentsFilters {
  return {
    q: filters.q,
    provider: filters.provider,
    method: filters.method,
    page: filters.page,
    status:
      filters.status &&
      v1Statuses.has(filters.status)
        ? filters.status
        : undefined,
    type:
      filters.type &&
      v1Types.has(filters.type)
        ? filters.type
        : undefined,
  }
}

function financePaymentsHref(
  filters: PaymentsFilters,
  page: number,
) {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.provider) {
    params.set('provider', filters.provider)
  }
  if (filters.method) {
    params.set('method', filters.method)
  }
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return query
    ? `/admin/finance/payments?${query}`
    : '/admin/finance/payments'
}

export async function FinancePaymentsV1Page({
  filters,
}: {
  filters: PaymentsFilters
}) {
  const safeFilters = v1Filters(filters)
  const data = await getFinancePaymentsData(safeFilters)

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Finance / Payments
          </span>
          <h1>Payments</h1>
          <p>
            Search and review Version 1 vote and ticket payment
            records without exposing finance data publicly.
          </p>
        </div>

        <Link
          className="button"
          href="/admin/finance/reconciliation"
        >
          Reconciliation
        </Link>
      </div>

      <form
        className="panel live-admin-form mobile-admin-form"
        method="get"
      >
        <label className="full">
          Search
          <input
            name="q"
            defaultValue={safeFilters.q ?? ''}
            placeholder="Order, payment ID, provider reference, payer name, email or phone"
          />
        </label>

        <label>
          Payment type
          <select
            name="type"
            defaultValue={safeFilters.type ?? ''}
          >
            <option value="">All types</option>
            <option value="vote">Vote</option>
            <option value="ticket">Ticket</option>
          </select>
        </label>

        <label>
          Status
          <select
            name="status"
            defaultValue={safeFilters.status ?? ''}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">
              Processing
            </option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label>
          Payment method
          <select
            name="method"
            defaultValue={safeFilters.method ?? ''}
          >
            <option value="">All methods</option>
            <option value="in-app">Vult App</option>
            <option value="momo">Mobile Money</option>
            <option value="card">Card</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <label>
          Provider
          <select
            name="provider"
            defaultValue={safeFilters.provider ?? ''}
          >
            <option value="">All providers</option>
            {data.providers.map((provider) => (
              <option key={provider} value={provider}>
                {humanize(provider)}
              </option>
            ))}
          </select>
        </label>

        <div className="full v2-admin-page-actions">
          <button className="button" type="submit">
            Apply filters
          </button>
          <Link
            className="button secondary"
            href="/admin/finance/payments"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Payment records</h2>
            <span className="live-data-badge">
              {data.totalCount} RESULTS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Order / Payment</th>
                <th>Type</th>
                <th>Provider</th>
                <th>Method</th>
                <th>Payer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Order</th>
                <th>Paid</th>
                <th>Failure / delivery</th>
              </tr>
            </thead>

            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong>{payment.order_number}</strong>
                    <small>{payment.id}</small>
                    <small>
                      Provider ref:{' '}
                      {payment.provider_transaction_id ||
                        '—'}
                    </small>
                  </td>
                  <td>
                    {humanize(payment.payment_type)}
                  </td>
                  <td>{humanize(payment.provider)}</td>
                  <td>
                    {paymentMethodLabel(
                      payment.payment_method,
                    )}
                  </td>
                  <td>
                    <strong>
                      {payment.payer_name || '—'}
                    </strong>
                    <small>
                      {payment.payer_email ||
                        payment.payer_phone ||
                        '—'}
                    </small>
                  </td>
                  <td>
                    {money(
                      payment.amount_number,
                      payment.currency,
                    )}
                  </td>
                  <td>
                    <StatusBadge
                      value={payment.status}
                    />
                  </td>
                  <td>
                    <StatusBadge
                      value={payment.order_status}
                    />
                  </td>
                  <td>
                    {dateTime(payment.paid_at)}
                  </td>
                  <td>
                    {payment.failure_reason ? (
                      <strong>
                        {payment.failure_reason}
                      </strong>
                    ) : payment.delivery_last_error ? (
                      <strong>
                        {payment.delivery_last_error}
                      </strong>
                    ) : (
                      <span>
                        {humanize(
                          payment.delivery_status,
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {!data.payments.length ? (
                <tr>
                  <td colSpan={10}>
                    <div className="live-empty-state compact">
                      <strong>
                        No payment records match these
                        filters.
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
                href={financePaymentsHref(
                  safeFilters,
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
                href={financePaymentsHref(
                  safeFilters,
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
