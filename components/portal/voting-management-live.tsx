import Link from 'next/link'
import { saveVotePricing } from '@/lib/admin/voting-actions'
import { getAdminVotingData } from '@/lib/voting/live-data'

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    )
}

function money(
  value: unknown,
  currency = 'SLE',
) {
  const amount = Number(value ?? 0)

  return `${
    currency === 'SLE'
      ? 'NLe'
      : currency
  } ${amount.toLocaleString()}`
}

function dateTime(
  value?: string | null,
) {
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

function ReadinessItem({
  ready,
  label,
}: {
  ready: boolean
  label: string
}) {
  return (
    <li>
      <strong>
        {ready ? 'Ready' : 'Needs attention'}
      </strong>
      <span>{label}</span>
    </li>
  )
}

export async function VotingManagementLivePage({
  requestedEditionId,
  saved,
  error,
}: {
  requestedEditionId?: string
  saved?: string
  error?: string
}) {
  const data =
    await getAdminVotingData(
      requestedEditionId,
    )

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Awards / Voting
          </span>
          <h1>Voting</h1>
          <p>
            Select an award edition,
            configure its approved vote
            price and monitor voting
            readiness and order activity.
          </p>
        </div>
      </div>

      {saved === '1' ? (
        <div className="live-form-message success">
          Vote pricing saved
          successfully.
        </div>
      ) : null}

      {error ? (
        <div className="live-form-message error">
          {error ===
          'invalid_pricing'
            ? 'Review the vote price and quantity limits.'
            : 'The voting configuration could not be saved.'}
        </div>
      ) : null}

      {data.editions.length ? (
        <form
          method="get"
          className="panel live-admin-form mobile-admin-form"
        >
          <label className="full">
            Award edition
            <select
              name="edition"
              defaultValue={
                data.edition?.id ?? ''
              }
            >
              {data.editions.map(
                (edition) => (
                  <option
                    key={edition.id}
                    value={edition.id}
                  >
                    {edition.award?.name ??
                      'Award'}{' '}
                    —{' '}
                    {
                      edition.edition_label
                    }{' '}
                    ({edition.year})
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="full">
            <button
              className="button secondary"
              type="submit"
            >
              Load Edition
            </button>
          </div>
        </form>
      ) : null}

      {data.edition ? (
        <>
          <div className="v2-admin-stats mobile-admin-stats">
            <article>
              <span>
                Vote orders
              </span>
              <strong>
                {data.counts.total}
              </strong>
              <small>
                Selected edition
              </small>
            </article>

            <article>
              <span>Paid</span>
              <strong>
                {data.counts.paid}
              </strong>
              <small>
                Ledger eligible
              </small>
            </article>

            <article>
              <span>
                Published nominees
              </span>
              <strong>
                {
                  data.nomineeCounts
                    .published
                }
              </strong>
              <small>
                of{' '}
                {
                  data.nomineeCounts
                    .total
                }{' '}
                nominees
              </small>
            </article>

            <article>
              <span>
                Voting readiness
              </span>
              <strong>
                {data.readiness.ready
                  ? 'READY'
                  : 'NOT READY'}
              </strong>
              <small>
                Public vote gate
              </small>
            </article>
          </div>

          <section className="panel live-voting-config">
            <div className="v2-card-head">
              <div>
                <span className="v2-admin-eyebrow">
                  Selected edition
                </span>
                <h2>
                  {data.edition.award
                    ?.name ??
                    'Award'}{' '}
                  —{' '}
                  {
                    data.edition
                      .edition_label
                  }{' '}
                  · {data.edition.year}
                </h2>
              </div>

              <span className="live-data-badge">
                {humanize(
                  data.edition.status,
                )}
              </span>
            </div>

            <div className="live-voting-state-grid">
              <div>
                <span>
                  Voting window
                </span>
                <strong>
                  {dateTime(
                    data.edition
                      .voting_starts_at,
                  )}
                </strong>
                <small>to</small>
                <strong>
                  {dateTime(
                    data.edition
                      .voting_ends_at,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Leaderboard
                </span>
                <strong>
                  {humanize(
                    data.edition
                      .leaderboard_visibility,
                  )}
                </strong>
              </div>
            </div>

            <div className="live-vult-note">
              <strong>
                Public voting gate
              </strong>
              <ul>
                <ReadinessItem
                  ready={
                    data.readiness
                      .editionPublic
                  }
                  label="Edition is public"
                />
                <ReadinessItem
                  ready={
                    data.readiness
                      .lifecycleOpen
                  }
                  label="Edition status is Voting Open"
                />
                <ReadinessItem
                  ready={
                    data.readiness
                      .windowConfigured
                  }
                  label="Voting start and end are configured"
                />
                <ReadinessItem
                  ready={
                    data.readiness
                      .windowActive
                  }
                  label="Current time is inside the voting window"
                />
                <ReadinessItem
                  ready={
                    data.readiness
                      .pricingConfigured
                  }
                  label="Vote pricing is configured"
                />
                <ReadinessItem
                  ready={
                    data.readiness
                      .pricingActive
                  }
                  label="Vote pricing is active"
                />
                <ReadinessItem
                  ready={
                    data.readiness
                      .publishedNominees
                  }
                  label="At least one nominee is published and public"
                />
              </ul>

              {!data.readiness.ready ? (
                <p>
                  Public voting remains
                  closed until every
                  readiness check above
                  is satisfied.
                </p>
              ) : (
                <p>
                  This edition is ready
                  for a live Vult payment
                  test.
                </p>
              )}

              {data.canManageEdition ? (
                <Link
                  className="button secondary compact"
                  href="/admin/awards/editions"
                >
                  Manage Edition Window
                </Link>
              ) : null}

              {data.readiness.ready &&
              data.firstPublicNomineeCode ? (
                <Link
                  className="button compact"
                  href={`/vote/${encodeURIComponent(
                    data.firstPublicNomineeCode,
                  )}`}
                  target="_blank"
                >
                  Open Test Nominee
                </Link>
              ) : null}
            </div>

            <form
              action={saveVotePricing}
              className="live-admin-form voting-config-form mobile-admin-form"
            >
              <input
                type="hidden"
                name="award_edition_id"
                value={
                  data.edition.id
                }
              />

              <label>
                Price per vote
                <input
                  name="unit_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={
                    data.pricing
                      ?.unit_price ?? ''
                  }
                  placeholder="Enter approved price"
                />
              </label>

              <label>
                Currency
                <input
                  name="currency"
                  required
                  maxLength={8}
                  defaultValue={
                    data.pricing
                      ?.currency ??
                    'SLE'
                  }
                />
              </label>

              <label>
                Minimum votes
                <input
                  name="min_quantity"
                  type="number"
                  min="1"
                  required
                  defaultValue={
                    data.pricing
                      ?.min_quantity ??
                    1
                  }
                />
              </label>

              <label>
                Maximum votes
                <input
                  name="max_quantity"
                  type="number"
                  min="1"
                  required
                  defaultValue={
                    data.pricing
                      ?.max_quantity ??
                    1000
                  }
                />
              </label>

              <label className="full">
                Quick quantities
                <input
                  name="quick_quantities"
                  defaultValue={
                    data.pricing
                      ?.quick_quantities
                      ?.join(', ') ??
                    '10, 25, 50, 100'
                  }
                />
                <small>
                  Comma-separated
                  positive whole
                  numbers.
                </small>
              </label>

              <label className="live-check">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked={
                    data.pricing
                      ?.is_active ??
                    true
                  }
                />
                Pricing active
              </label>

              <div className="full">
                <button
                  className="button"
                  type="submit"
                >
                  Save Vote Pricing
                </button>
              </div>
            </form>

            <div className="live-vult-note">
              <strong>
                Vult payment flow
              </strong>
              <p>
                Vote checkout already
                initializes Vult payment
                links and the webhook
                settlement flow allocates
                successful votes. Testing
                uses the Vult environment
                configured in Vercel.
              </p>
            </div>
          </section>

          <section className="panel v2-admin-table-panel">
            <div className="v2-admin-table-toolbar">
              <div>
                <h2>
                  Recent vote orders
                </h2>
                <span className="live-data-badge">
                  SELECTED EDITION
                </span>
              </div>
            </div>

            <div className="live-table-wrap mobile-table-wrap">
              <table className="live-admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Nominee</th>
                    <th>Votes</th>
                    <th>
                      Unit Price
                    </th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {data.recentOrders.map(
                    (order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>
                            {
                              order.order_number
                            }
                          </strong>
                        </td>
                        <td>
                          <strong>
                            {order.nominee
                              ?.full_name ??
                              '—'}
                          </strong>
                          <small>
                            {order.nominee
                              ?.nominee_code ??
                              '—'}
                          </small>
                        </td>
                        <td>
                          {
                            order.quantity
                          }
                        </td>
                        <td>
                          {money(
                            order.unit_price,
                            order.currency,
                          )}
                        </td>
                        <td>
                          {money(
                            order.total_amount,
                            order.currency,
                          )}
                        </td>
                        <td>
                          {humanize(
                            order.status,
                          )}
                        </td>
                        <td>
                          {dateTime(
                            order.created_at,
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                  {!data.recentOrders
                    .length ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="live-empty-state compact">
                          <strong>
                            No vote orders
                            for this
                            edition yet.
                          </strong>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="live-empty-state">
          <strong>
            No accessible award edition
            found for voting management.
          </strong>
        </div>
      )}
    </div>
  )
}
