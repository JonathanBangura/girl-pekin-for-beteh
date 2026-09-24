import Link from 'next/link'
import {
  getRefundManagementData,
  getFinanceReportsData,
} from '@/lib/finance/refund-report-data'
import { recordExternalFullRefund } from '@/lib/finance/refund-actions'

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

function RefundNotice({
  recorded,
  error,
}: {
  recorded?: string
  error?: string
}) {
  if (error) {
    const messages: Record<string, string> = {
      missing_fields:
        'Complete every required field before recording the refund/reversal.',
      confirmation_required:
        'You must confirm that the money was already returned or reversed outside this platform.',
      record_failed:
        'The refund/reversal record could not be completed.',
      '23505':
        'That provider confirmation reference has already been used.',
      '42501':
        'Your account does not have permission to record refunds.',
    }

    return (
      <div className="live-form-message error">
        {messages[error] ||
          'The refund/reversal could not be recorded. Review the payment state and try again.'}
      </div>
    )
  }

  if (recorded === '1') {
    return (
      <div className="live-form-message success">
        External refund/reversal recorded successfully. Linked
        votes or tickets were invalidated according to the payment
        type.
      </div>
    )
  }

  return null
}

export async function FinanceRefundsLivePage({
  recorded,
  error,
}: {
  recorded?: string
  error?: string
}) {
  const data = await getRefundManagementData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Finance / Refunds
          </span>
          <h1>Refunds & Reversals</h1>
          <p>
            Record only money that has already been refunded or
            reversed through the real provider/support process.
          </p>
        </div>

        <div className="v2-admin-page-actions">
          <Link
            className="button secondary"
            href="/admin/finance/payments"
          >
            Payments
          </Link>
          <Link
            className="button secondary"
            href="/admin/finance/reports"
          >
            Reports
          </Link>
        </div>
      </div>

      <RefundNotice recorded={recorded} error={error} />

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Important
            </span>
            <h2>This screen does not send money</h2>
          </div>
        </div>

        <p className="live-empty-copy">
          The supplied Vult merchant API does not document a
          refund endpoint. Complete/confirm the refund or reversal
          through the authorized external provider process first.
          Then record that completed money movement here using its
          confirmation reference.
        </p>
      </section>

      <details className="panel live-create-panel">
        <summary>Record completed external refund/reversal</summary>

        {data.eligiblePayments.length ? (
          <form
            action={recordExternalFullRefund}
            className="live-admin-form mobile-admin-form"
          >
            <label className="full">
              Successful payment
              <select name="payment_id" required>
                <option value="">Select payment</option>
                {data.eligiblePayments.map((payment) => (
                  <option
                    key={payment.id}
                    value={payment.id}
                  >
                    {payment.order_number} ·{' '}
                    {humanize(payment.payment_type)} ·{' '}
                    {money(
                      payment.amount_number,
                      payment.currency,
                    )}{' '}
                    · {humanize(payment.provider)}
                  </option>
                ))}
              </select>
              <small>
                Only fully settled successful payments are shown.
              </small>
            </label>

            <label>
              Record type
              <select
                name="refund_kind"
                defaultValue="refund"
                required
              >
                <option value="refund">
                  Full refund
                </option>
                <option value="reversal">
                  Full reversal
                </option>
              </select>
            </label>

            <label>
              External method
              <input
                name="external_method"
                required
                placeholder="e.g. Vult Support / Bank reversal"
              />
            </label>

            <label className="full">
              Provider / external confirmation reference
              <input
                name="provider_refund_id"
                required
                placeholder="Reference proving the money movement"
              />
            </label>

            <label className="full">
              Reason
              <textarea
                name="reason"
                rows={3}
                required
                placeholder="Why was this payment refunded or reversed?"
              />
            </label>

            <label className="full">
              Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Optional operational notes"
              />
            </label>

            <label className="live-check full">
              <input
                type="checkbox"
                name="confirmation"
                required
              />
              I confirm the money has already been returned or
              reversed outside this platform and the reference above
              is genuine.
            </label>

            <div className="full">
              <button
                className="button"
                type="submit"
              >
                Record completed refund/reversal
              </button>
            </div>
          </form>
        ) : (
          <div className="live-empty-state compact">
            <strong>
              No fully settled successful payment is currently
              eligible.
            </strong>
          </div>
        )}
      </details>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Refund register</h2>
            <span className="live-data-badge">
              {data.refunds.length} RECORDS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Type</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Refund type</th>
                <th>External method</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Processed</th>
                <th>Reason</th>
              </tr>
            </thead>

            <tbody>
              {data.refunds.map((refund) => (
                <tr key={refund.id}>
                  <td>
                    <strong>{refund.order_number}</strong>
                    <small>{refund.payer_name || '—'}</small>
                  </td>
                  <td>{humanize(refund.payment_type)}</td>
                  <td>{humanize(refund.provider)}</td>
                  <td>
                    {money(
                      refund.amount_number,
                      refund.currency,
                    )}
                  </td>
                  <td>{humanize(refund.refund_kind)}</td>
                  <td>
                    {refund.external_method || '—'}
                  </td>
                  <td>
                    {refund.provider_refund_id || '—'}
                  </td>
                  <td>{humanize(refund.status)}</td>
                  <td>{dateTime(refund.processed_at)}</td>
                  <td>
                    <strong>{refund.reason}</strong>
                    {refund.notes ? (
                      <small>{refund.notes}</small>
                    ) : null}
                  </td>
                </tr>
              ))}

              {!data.refunds.length && (
                <tr>
                  <td colSpan={10}>
                    <div className="live-empty-state compact">
                      <strong>
                        No refunds or reversals recorded yet.
                      </strong>
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

export async function FinanceReportsLivePage({
  filters,
}: {
  filters: {
    from?: string
    to?: string
  }
}) {
  const data = await getFinanceReportsData(filters)

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Finance / Reports
          </span>
          <h1>Finance Reports</h1>
          <p>
            Gross collections, refunds/reversals and net collected
            totals derived from real payment records.
          </p>
        </div>

        <Link
          className="button secondary"
          href="/admin/finance/refunds"
        >
          Refund Register
        </Link>
      </div>

      <form
        className="panel live-admin-form mobile-admin-form"
        method="get"
      >
        <label>
          From
          <input
            name="from"
            type="date"
            defaultValue={data.from}
          />
        </label>

        <label>
          To
          <input
            name="to"
            type="date"
            defaultValue={data.to}
          />
        </label>

        <div className="full v2-admin-page-actions">
          <button className="button" type="submit">
            Apply date range
          </button>

          <Link
            className="button secondary"
            href="/admin/finance/reports"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Paid records</span>
          <strong>{data.paymentCount}</strong>
          <small>Successful/settled history</small>
        </article>

        <article>
          <span>Refund records</span>
          <strong>{data.refundCount}</strong>
          <small>Successful external records</small>
        </article>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Revenue summary
            </span>
            <h2>Gross, refunds and net</h2>
          </div>
        </div>

        {data.byCurrency.length ? (
          <div className="v2-admin-stats mobile-admin-stats">
            {data.byCurrency.map((row) => (
              <article key={row.currency}>
                <span>{row.currency}</span>
                <strong>
                  {money(row.net, row.currency)}
                </strong>
                <small>
                  Gross {money(row.gross, row.currency)} ·
                  Refunds {money(row.refunds, row.currency)}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="live-empty-state compact">
            <strong>
              No settled finance activity in this period.
            </strong>
          </div>
        )}
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Collections by type</h2>
            <span className="live-data-badge">
              LIVE DATA
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Payment type</th>
                <th>Paid records</th>
                <th>Gross collected</th>
              </tr>
            </thead>
            <tbody>
              {data.byType.map((row) => (
                <tr key={row.payment_type}>
                  <td>{humanize(row.payment_type)}</td>
                  <td>{row.count}</td>
                  <td>
                    {money(row.amount, row.currency)}
                  </td>
                </tr>
              ))}

              {!data.byType.length && (
                <tr>
                  <td colSpan={3}>
                    <div className="live-empty-state compact">
                      <strong>No report rows.</strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                <th>Payment method</th>
                <th>Paid records</th>
                <th>Gross collected</th>
              </tr>
            </thead>
            <tbody>
              {data.byMethod.map((row) => (
                <tr
                  key={`${row.payment_method}:${row.currency}`}
                >
                  <td>
                    {paymentMethodLabel(row.payment_method)}
                  </td>
                  <td>{row.count}</td>
                  <td>{money(row.amount, row.currency)}</td>
                </tr>
              ))}

              {!data.byMethod.length && (
                <tr>
                  <td colSpan={3}>
                    <div className="live-empty-state compact">
                      <strong>No payment-method report rows.</strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Exports
            </span>
            <h2>CSV exports</h2>
          </div>
        </div>

        <div className="v2-admin-page-actions">
          <a
            className="button"
            href={`/api/admin/finance/export?report=payments${
              data.from
                ? `&from=${encodeURIComponent(data.from)}`
                : ''
            }${
              data.to
                ? `&to=${encodeURIComponent(data.to)}`
                : ''
            }`}
          >
            Export payments CSV
          </a>

          <a
            className="button secondary"
            href={`/api/admin/finance/export?report=refunds${
              data.from
                ? `&from=${encodeURIComponent(data.from)}`
                : ''
            }${
              data.to
                ? `&to=${encodeURIComponent(data.to)}`
                : ''
            }`}
          >
            Export refunds CSV
          </a>
        </div>
      </section>
    </div>
  )
}
