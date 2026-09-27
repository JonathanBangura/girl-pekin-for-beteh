import Link from 'next/link'
import { getFinanceReportsData } from '@/lib/finance/refund-report-data'

function money(amount: number, currency: string) {
  return `${
    currency === 'SLE' ? 'NLe' : currency
  } ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
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

export async function FinanceReportsV1Page({
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
            Settled collections by payment type, payment method
            and currency for Version 1 operations.
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
            href="/admin/finance/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
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
          <span>Settled payment records</span>
          <strong>{data.paymentCount.toLocaleString()}</strong>
          <small>Payment-backed collections history</small>
        </article>

        <article>
          <span>Currencies</span>
          <strong>{data.byCurrency.length}</strong>
          <small>Currencies represented in the period</small>
        </article>

        <article>
          <span>Payment methods</span>
          <strong>{data.byMethod.length}</strong>
          <small>Vult App, Mobile Money and Card</small>
        </article>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Revenue summary
            </span>
            <h2>Collected revenue</h2>
          </div>
        </div>

        {data.byCurrency.length ? (
          <div className="v2-admin-stats mobile-admin-stats">
            {data.byCurrency.map((row) => (
              <article key={row.currency}>
                <span>{row.currency}</span>
                <strong>
                  {money(row.gross, row.currency)}
                </strong>
                <small>Settled collections</small>
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
                <th>Records</th>
                <th>Collected</th>
              </tr>
            </thead>
            <tbody>
              {data.byType.map((row) => (
                <tr
                  key={`${row.payment_type}:${row.currency}`}
                >
                  <td>{humanize(row.payment_type)}</td>
                  <td>{row.count.toLocaleString()}</td>
                  <td>
                    {money(row.amount, row.currency)}
                  </td>
                </tr>
              ))}

              {!data.byType.length ? (
                <tr>
                  <td colSpan={3}>
                    <div className="live-empty-state compact">
                      <strong>No report rows.</strong>
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
                <th>Currency</th>
                <th>Records</th>
                <th>Collected</th>
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
                  <td>{row.currency}</td>
                  <td>{row.count.toLocaleString()}</td>
                  <td>{money(row.amount, row.currency)}</td>
                </tr>
              ))}

              {!data.byMethod.length ? (
                <tr>
                  <td colSpan={4}>
                    <div className="live-empty-state compact">
                      <strong>
                        No payment-method rows.
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
