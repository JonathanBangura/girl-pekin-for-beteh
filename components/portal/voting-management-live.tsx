import { saveVotePricing } from '@/lib/admin/voting-actions'
import { getAdminVotingData } from '@/lib/voting/live-data'

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function money(value: unknown, currency = 'SLE') {
  const amount = Number(value ?? 0)
  return `${currency === 'SLE' ? 'NLe' : currency} ${amount.toLocaleString()}`
}

export async function VotingManagementLivePage({
  saved,
  error,
}: {
  saved?: string
  error?: string
}) {
  const data = await getAdminVotingData()

  return (
    <div className="portal-content v2-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Awards / Voting</span>
          <h1>Voting</h1>
          <p>Configure real vote pricing and monitor live vote-order activity.</p>
        </div>
      </div>

      {saved === '1' && (
        <div className="live-form-message success">
          Vote pricing saved successfully.
        </div>
      )}

      {error && (
        <div className="live-form-message error">
          The voting configuration could not be saved.
        </div>
      )}

      <div className="v2-admin-stats">
        <article>
          <span>Vote orders</span>
          <strong>{data.counts.total}</strong>
          <small>Live database</small>
        </article>
        <article>
          <span>Paid</span>
          <strong>{data.counts.paid}</strong>
          <small>Ledger eligible</small>
        </article>
        <article>
          <span>Pending</span>
          <strong>{data.counts.pending}</strong>
          <small>Awaiting payment</small>
        </article>
        <article>
          <span>Failed</span>
          <strong>{data.counts.failed}</strong>
          <small>Payment/order failures</small>
        </article>
      </div>

      {data.edition ? (
        <section className="panel live-voting-config">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">Current edition</span>
              <h2>
                {data.edition.edition_label} · {data.edition.year}
              </h2>
            </div>
            <span className="live-data-badge">
              {humanize(data.edition.status)}
            </span>
          </div>

          <div className="live-voting-state-grid">
            <div>
              <span>Voting window</span>
              <strong>
                {data.edition.voting_starts_at
                  ? new Intl.DateTimeFormat('en-SL', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(data.edition.voting_starts_at))
                  : '—'}
              </strong>
              <small>to</small>
              <strong>
                {data.edition.voting_ends_at
                  ? new Intl.DateTimeFormat('en-SL', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(data.edition.voting_ends_at))
                  : '—'}
              </strong>
            </div>

            <div>
              <span>Leaderboard</span>
              <strong>{humanize(data.edition.leaderboard_visibility)}</strong>
            </div>
          </div>

          <form action={saveVotePricing} className="live-admin-form voting-config-form">
            <input
              type="hidden"
              name="award_edition_id"
              value={data.edition.id}
            />

            <label>
              Price per vote
              <input
                name="unit_price"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={data.pricing?.unit_price ?? ''}
                placeholder="Enter approved price"
              />
            </label>

            <label>
              Currency
              <input
                name="currency"
                required
                maxLength={8}
                defaultValue={data.pricing?.currency ?? 'SLE'}
              />
            </label>

            <label>
              Minimum votes
              <input
                name="min_quantity"
                type="number"
                min="1"
                required
                defaultValue={data.pricing?.min_quantity ?? 1}
              />
            </label>

            <label>
              Maximum votes
              <input
                name="max_quantity"
                type="number"
                min="1"
                required
                defaultValue={data.pricing?.max_quantity ?? 1000}
              />
            </label>

            <label className="full">
              Quick quantities
              <input
                name="quick_quantities"
                defaultValue={
                  data.pricing?.quick_quantities?.join(', ') ??
                  '10, 25, 50, 100'
                }
              />
              <small>Comma-separated positive whole numbers.</small>
            </label>

            <label className="live-check">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={data.pricing?.is_active ?? true}
              />
              Pricing active
            </label>

            <div className="full">
              <button className="button" type="submit">
                Save vote pricing
              </button>
            </div>
          </form>

          <div className="live-vult-note">
            <strong>Payment provider boundary</strong>
            <p>
              Vote orders and payment records are ready. Vult payment
              initiation and webhook verification remain disabled until the
              exact Vult API contract is supplied.
            </p>
          </div>
        </section>
      ) : (
        <div className="live-empty-state">
          <strong>No active award edition found.</strong>
        </div>
      )}

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Recent vote orders</h2>
            <span className="live-data-badge">LIVE DATA</span>
          </div>
        </div>

        <div className="live-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Nominee</th>
                <th>Votes</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.order_number}</strong></td>
                  <td>
                    <strong>{order.nominee?.full_name ?? '—'}</strong>
                    <small>{order.nominee?.nominee_code ?? '—'}</small>
                  </td>
                  <td>{order.quantity}</td>
                  <td>{money(order.unit_price, order.currency)}</td>
                  <td>{money(order.total_amount, order.currency)}</td>
                  <td>{humanize(order.status)}</td>
                  <td>
                    {new Intl.DateTimeFormat('en-SL', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(order.created_at))}
                  </td>
                </tr>
              ))}

              {!data.recentOrders.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="live-empty-state compact">
                      <strong>No vote orders yet.</strong>
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
