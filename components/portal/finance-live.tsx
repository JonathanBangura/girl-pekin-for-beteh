import Link from 'next/link'
import {
  getFinanceOverviewData,
  getFinancePaymentsData,
  getFinanceReconciliationData,
} from '@/lib/finance/data'
import {
  reprocessPaymentEvent,
  repairPaymentSettlement,
} from '@/lib/finance/actions'

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
    normalized === 'paid'
      ? 'teal'
      : normalized === 'failed' ||
          normalized === 'cancelled' ||
          normalized === 'reversed'
        ? 'coral'
        : normalized === 'refunded' ||
            normalized === 'partially_refunded'
          ? 'gold'
          : ''

  return (
    <span className={`pill ${tone}`}>
      {humanize(normalized)}
    </span>
  )
}

function FinanceNotice({
  reprocessed,
  repaired,
  error,
}: {
  reprocessed?: string
  repaired?: string
  error?: string
}) {
  if (error) {
    const messages: Record<string, string> = {
      invalid_event:
        'The reconciliation event reference is invalid.',
      event_not_found:
        'The payment event could not be found.',
      event_not_reprocessable:
        'Only linked Vult completed events can be reprocessed.',
      payment_not_found:
        'The payment record could not be found.',
      payment_not_succeeded:
        'Only already-successful payments can use internal settlement repair.',
      provider_reference_missing:
        'The provider transaction reference is missing, so the payment cannot be repaired automatically.',
      reprocess_failed:
        'The completed webhook could not be reprocessed. Review the payment and event details before retrying.',
      repair_failed:
        'The internal settlement repair failed. No provider refund or charge was attempted.',
    }

    return (
      <div className="live-form-message error">
        {messages[error] ||
          'The finance operation could not be completed.'}
      </div>
    )
  }

  if (reprocessed === '1') {
    return (
      <div className="live-form-message success">
        The completed provider event was reprocessed successfully.
      </div>
    )
  }

  if (repaired === '1') {
    return (
      <div className="live-form-message success">
        The internal payment settlement was repaired successfully.
      </div>
    )
  }

  return null
}

export async function FinanceOverviewLivePage() {
  const data = await getFinanceOverviewData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Finance Operations
          </span>
          <h1>Finance Overview</h1>
          <p>
            Live payment volume, payment health and reconciliation
            exceptions across voting and event ticketing.
          </p>
        </div>

        <div className="v2-admin-page-actions">
          <Link
            className="button secondary"
            href="/admin/finance/payments"
          >
            View Payments
          </Link>
          <Link
            className="button"
            href="/admin/finance/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </div>

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Successful</span>
          <strong>{data.succeededCount}</strong>
          <small>Settled payments</small>
        </article>

        <article>
          <span>Pending</span>
          <strong>{data.pendingCount}</strong>
          <small>
            {data.stalePaymentCount} older than 30 min
          </small>
        </article>

        <article>
          <span>Failed</span>
          <strong>{data.failedCount}</strong>
          <small>Provider/payment failures</small>
        </article>

        <article>
          <span>Reconciliation</span>
          <strong>{data.unresolvedEventCount}</strong>
          <small>Unresolved webhook events</small>
        </article>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Successful volume
            </span>
            <h2>Collected by currency</h2>
          </div>
        </div>

        {data.volumeByCurrency.length ? (
          <div className="v2-admin-stats mobile-admin-stats">
            {data.volumeByCurrency.map((volume) => (
              <article key={volume.currency}>
                <span>{volume.currency}</span>
                <strong>
                  {money(volume.amount, volume.currency)}
                </strong>
                <small>Successful payments only</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="live-empty-state compact">
            <strong>No successful payments yet.</strong>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Payment methods
            </span>
            <h2>Successful collections by method</h2>
          </div>
        </div>

        {data.methodBreakdown.length ? (
          <div className="v2-admin-stats mobile-admin-stats">
            {data.methodBreakdown.map((row) => (
              <article
                key={`${row.payment_method}:${row.currency}`}
              >
                <span>{paymentMethodLabel(row.payment_method)}</span>
                <strong>{money(row.amount, row.currency)}</strong>
                <small>
                  {row.count.toLocaleString()} successful payment(s) ·{' '}
                  {row.currency}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="live-empty-state compact">
            <strong>No successful payment-method activity yet.</strong>
          </div>
        )}
      </section>

      {(data.unresolvedEventCount > 0 ||
        data.stalePaymentCount > 0) && (
        <section className="panel">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">
                Needs attention
              </span>
              <h2>Operational exceptions</h2>
            </div>
          </div>

          <p className="live-empty-copy">
            {data.unresolvedEventCount} provider event(s)
            require reconciliation and{' '}
            {data.stalePaymentCount} payment(s) have remained
            pending for more than 30 minutes.
          </p>

          <Link
            className="button"
            href="/admin/finance/reconciliation"
          >
            Review exceptions
          </Link>
        </section>
      )}

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Recent payments</h2>
            <span className="live-data-badge">
              LIVE DATA
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Type</th>
                <th>Provider</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {data.recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong>{payment.order_number}</strong>
                    <small>
                      {payment.provider_transaction_id ||
                        payment.id}
                    </small>
                  </td>
                  <td>
                    {humanize(payment.payment_type)}
                  </td>
                  <td>{humanize(payment.provider)}</td>
                  <td>
                    {paymentMethodLabel(payment.payment_method)}
                  </td>
                  <td>
                    {money(
                      payment.amount_number,
                      payment.currency,
                    )}
                  </td>
                  <td>
                    <StatusBadge value={payment.status} />
                  </td>
                  <td>{dateTime(payment.created_at)}</td>
                </tr>
              ))}

              {!data.recentPayments.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="live-empty-state compact">
                      <strong>No payment records yet.</strong>
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

function financePaymentsHref(
  filters: {
    status?: string
    type?: string
    provider?: string
    method?: string
    q?: string
    page?: string
  },
  page: number,
) {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.provider) params.set('provider', filters.provider)
  if (filters.method) params.set('method', filters.method)
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return query
    ? `/admin/finance/payments?${query}`
    : '/admin/finance/payments'
}

export async function FinancePaymentsLivePage({
  filters,
}: {
  filters: {
    status?: string
    type?: string
    provider?: string
    method?: string
    q?: string
    page?: string
  }
}) {
  const data = await getFinancePaymentsData(filters)

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Finance / Payments
          </span>
          <h1>Payments</h1>
          <p>
            Search and review real payment records without
            exposing them on public or nominee-facing pages.
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
            defaultValue={filters.q ?? ''}
            placeholder="Order, payment ID, provider reference, payer name, email or phone"
          />
        </label>

        <label>
          Payment type
          <select
            name="type"
            defaultValue={filters.type ?? ''}
          >
            <option value="">All types</option>
            <option value="vote">Vote</option>
            <option value="ticket">Ticket</option>
            <option value="donation">Donation</option>
          </select>
        </label>

        <label>
          Status
          <select
            name="status"
            defaultValue={filters.status ?? ''}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">
              Processing
            </option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
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
            defaultValue={filters.method ?? ''}
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
            defaultValue={filters.provider ?? ''}
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
                    {paymentMethodLabel(payment.payment_method)}
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
                    <StatusBadge value={payment.status} />
                  </td>
                  <td>
                    <StatusBadge
                      value={payment.order_status}
                    />
                  </td>
                  <td>{dateTime(payment.paid_at)}</td>
                  <td>
                    {payment.failure_reason ||
                      payment.delivery_last_error ||
                      '—'}
                  </td>
                </tr>
              ))}

              {!data.payments.length && (
                <tr>
                  <td colSpan={10}>
                    <div className="live-empty-state compact">
                      <strong>
                        No payments match these filters.
                      </strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data.totalPages > 1 ? (
          <div className="v2-admin-page-actions">
            {data.page > 1 ? (
              <Link
                className="button secondary"
                href={financePaymentsHref(filters, data.page - 1)}
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
                href={financePaymentsHref(filters, data.page + 1)}
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

export async function FinanceReconciliationLivePage({
  reprocessed,
  repaired,
  error,
  page,
}: {
  reprocessed?: string
  repaired?: string
  error?: string
  page?: string
}) {
  const data = await getFinanceReconciliationData({ page })

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Finance / Reconciliation
          </span>
          <h1>Payment Reconciliation</h1>
          <p>
            Detect and safely repair internal settlement
            exceptions without creating a new charge or
            inventing provider-side results.
          </p>
        </div>

        <Link
          className="button secondary"
          href="/admin/finance/payments"
        >
          View Payments
        </Link>
      </div>

      <FinanceNotice
        reprocessed={reprocessed}
        repaired={repaired}
        error={error}
      />

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Critical</span>
          <strong>{data.criticalCount}</strong>
          <small>Settlement exceptions</small>
        </article>

        <article>
          <span>Warnings</span>
          <strong>{data.warningCount}</strong>
          <small>Review required</small>
        </article>

        <article>
          <span>Total cases</span>
          <strong>{data.totalCount}</strong>
          <small>Current derived exceptions</small>
        </article>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Safety boundary
            </span>
            <h2>No provider charge or refund is triggered here</h2>
          </div>
        </div>

        <p className="live-empty-copy">
          Reprocessing uses the already-received completed
          provider event. Internal repair is limited to a
          payment already recorded as successful. Stale
          pending payments are review-only and cannot be
          forced successful from this screen.
        </p>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Reconciliation cases</h2>
            <span className="live-data-badge">
              LIVE DERIVED CHECKS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Issue</th>
                <th>Order</th>
                <th>Reference</th>
                <th>Detected</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.cases.map((item) => (
                <tr key={item.key}>
                  <td>
                    <span
                      className={`pill ${
                        item.severity === 'critical'
                          ? 'coral'
                          : 'gold'
                      }`}
                    >
                      {humanize(item.severity)}
                    </span>
                  </td>

                  <td>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                    <small>{humanize(item.kind)}</small>
                  </td>

                  <td>{item.order_number || '—'}</td>

                  <td>
                    <small>
                      Payment: {item.payment_id || '—'}
                    </small>
                    <small>
                      Event: {item.payment_event_id ?? '—'}
                    </small>
                  </td>

                  <td>{dateTime(item.created_at)}</td>

                  <td>
                    {item.can_reprocess_event &&
                    item.payment_event_id ? (
                      <form
                        action={reprocessPaymentEvent}
                      >
                        <input
                          type="hidden"
                          name="payment_event_id"
                          value={item.payment_event_id}
                        />
                        <button
                          className="button compact"
                          type="submit"
                        >
                          Reprocess event
                        </button>
                      </form>
                    ) : item.can_repair_payment &&
                      item.payment_id ? (
                      <form
                        action={repairPaymentSettlement}
                      >
                        <input
                          type="hidden"
                          name="payment_id"
                          value={item.payment_id}
                        />
                        <button
                          className="button compact"
                          type="submit"
                        >
                          Repair settlement
                        </button>
                      </form>
                    ) : (
                      <span>Review only</span>
                    )}
                  </td>
                </tr>
              ))}

              {!data.cases.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="live-empty-state compact">
                      <strong>
                        No reconciliation exceptions detected.
                      </strong>
                      <p>
                        Current payment, order, ledger and
                        ticket records are internally aligned.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data.totalPages > 1 ? (
          <div className="v2-admin-page-actions">
            {data.page > 1 ? (
              <Link
                className="button secondary"
                href={`/admin/finance/reconciliation?page=${
                  data.page - 1
                }`}
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
                href={`/admin/finance/reconciliation?page=${
                  data.page + 1
                }`}
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
