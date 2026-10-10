import Link from 'next/link'
import {
  getDonationCampaignsAdminData,
  getDonationDonorsData,
  getDonationListData,
  getDonationOverviewData,
  getDonationReportsData,
} from '@/lib/donations/admin-data'
import { saveDonationCampaignAction } from '@/lib/donations/actions'

function money(value: unknown, currency = 'SLE') {
  const amount = Number(value ?? 0)
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

function dateInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

function donorDisplay(row: any) {
  if (row.is_anonymous) return 'Anonymous Donor'
  if (row.donor_type === 'organisation') {
    return row.organisation_name || row.donor_name || 'Organisation Donor'
  }
  return row.donor_name || 'Donor'
}

function campaignOf(row: any) {
  const value = row?.campaign
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function methodLabel(value?: string | null) {
  if (value === 'in-app') return 'Vult App'
  if (value === 'momo') return 'Mobile Money'
  if (value === 'card') return 'Card'
  return 'Unknown'
}

function humanize(value?: string | null) {
  if (!value) return '—'
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function reportExportHref(from: string, to: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return query
    ? `/api/admin/donations/export?${query}`
    : '/api/admin/donations/export'
}

function donationListHref(
  filters: {
    status: string
    campaign: string
    q: string
  },
  page: number,
) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.campaign) params.set('campaign', filters.campaign)
  if (filters.q) params.set('q', filters.q)
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return query
    ? `/admin/donations/donations?${query}`
    : '/admin/donations/donations'
}

export async function DonationsOverviewAdminPage() {
  const data = await getDonationOverviewData()
  const firstCurrency = data.byCurrency[0] as any | undefined

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">Donations</span>
          <h1>Fundraising Overview</h1>
          <p>
            Successful contributions, active campaigns and recent donor
            activity across the Foundation.
          </p>
        </div>

        <div className="v2-admin-page-actions">
          <Link className="button" href="/admin/donations/campaigns">
            Manage campaigns
          </Link>
          <Link className="button secondary" href="/donate">
            Public donate page
          </Link>
        </div>
      </div>

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Successful donations</span>
          <strong>{data.donationCount.toLocaleString()}</strong>
          <small>Confirmed payment-backed contributions</small>
        </article>

        <article>
          <span>Total raised</span>
          <strong>
            {firstCurrency
              ? money(firstCurrency.amount, firstCurrency.currency)
              : 'NLe 0.00'}
          </strong>
          <small>
            {data.byCurrency.length > 1
              ? `${data.byCurrency.length} currencies represented`
              : 'Successful contributions'}
          </small>
        </article>

        <article>
          <span>Active campaigns</span>
          <strong>{data.activeCampaigns.toLocaleString()}</strong>
          <small>Including the General Fund</small>
        </article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Campaign performance</h2>
            <span className="live-data-badge">SUCCESSFUL DONATIONS</span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Fund / campaign</th>
                <th>Fund type</th>
                <th>Donations</th>
                <th>Raised</th>
              </tr>
            </thead>
            <tbody>
              {data.byCampaign.map((row: any) => (
                <tr key={`${row.campaign_id}:${row.currency}`}>
                  <td>
                    <strong>{row.campaign_title}</strong>
                    <small>{row.campaign_slug}</small>
                  </td>
                  <td>{humanize(row.fund_type)}</td>
                  <td>{Number(row.count ?? 0).toLocaleString()}</td>
                  <td>{money(row.amount, row.currency)}</td>
                </tr>
              ))}

              {!data.byCampaign.length ? (
                <tr>
                  <td colSpan={4}>
                    <div className="live-empty-state compact">
                      <strong>No successful donations yet.</strong>
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
            <h2>Recent donations</h2>
            <span className="live-data-badge">LATEST 12</span>
          </div>
          <Link
            className="button secondary compact"
            href="/admin/donations/donations"
          >
            View all
          </Link>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Donor</th>
                <th>Fund</th>
                <th>Amount</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row: any) => {
                const campaign = campaignOf(row)

                return (
                  <tr key={row.id}>
                    <td><strong>{row.donation_number}</strong></td>
                    <td>{donorDisplay(row)}</td>
                    <td>{campaign?.title ?? '—'}</td>
                    <td>{money(row.amount, row.currency)}</td>
                    <td>{dateTime(row.paid_at)}</td>
                  </tr>
                )
              })}

              {!data.recent.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="live-empty-state compact">
                      <strong>No successful donations yet.</strong>
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

function CampaignFields({
  campaign,
}: {
  campaign?: any
}) {
  return (
    <>
      {campaign?.id ? (
        <input type="hidden" name="id" value={campaign.id} />
      ) : null}

      <label>
        Title
        <input
          name="title"
          defaultValue={campaign?.title ?? ''}
          required
        />
      </label>

      <label>
        Slug
        <input
          name="slug"
          defaultValue={campaign?.slug ?? ''}
          placeholder="auto-from-title"
        />
      </label>

      <label>
        Campaign type
        <select
          name="campaign_kind"
          defaultValue={campaign?.campaign_kind ?? 'campaign'}
        >
          <option value="general">General fund</option>
          <option value="campaign">Campaign</option>
        </select>
      </label>

      <label>
        Fund type
        <select
          name="fund_type"
          defaultValue={campaign?.fund_type ?? 'restricted'}
        >
          <option value="unrestricted">Unrestricted</option>
          <option value="restricted">Restricted / designated</option>
        </select>
      </label>

      <label>
        Currency
        <input
          name="currency"
          defaultValue={campaign?.currency ?? 'SLE'}
          maxLength={10}
          required
        />
      </label>

      <label>
        Minimum donation
        <input
          name="minimum_amount"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={campaign?.minimum_amount ?? 10}
          required
        />
      </label>

      <label>
        Goal amount
        <input
          name="goal_amount"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={campaign?.goal_amount ?? ''}
          placeholder="Optional"
        />
      </label>

      <label>
        Sort order
        <input
          name="sort_order"
          type="number"
          defaultValue={campaign?.sort_order ?? 0}
        />
      </label>

      <label>
        Starts at
        <input
          name="starts_at"
          type="datetime-local"
          defaultValue={dateInput(campaign?.starts_at)}
        />
      </label>

      <label>
        Ends at
        <input
          name="ends_at"
          type="datetime-local"
          defaultValue={dateInput(campaign?.ends_at)}
        />
      </label>

      <label>
        Status
        <select
          name="status"
          defaultValue={campaign?.status ?? 'draft'}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <label>
        Cover image URL
        <input
          name="cover_image_url"
          type="url"
          defaultValue={campaign?.cover_image_url ?? ''}
          placeholder="Optional"
        />
      </label>

      <label className="full">
        Summary
        <textarea
          name="summary"
          rows={2}
          defaultValue={campaign?.summary ?? ''}
        />
      </label>

      <label className="full">
        Description
        <textarea
          name="description"
          rows={5}
          defaultValue={campaign?.description ?? ''}
        />
      </label>

      <label className="live-check-row">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={campaign?.is_public ?? false}
        />
        <span>Public campaign</span>
      </label>

      <label className="live-check-row">
        <input
          type="checkbox"
          name="show_progress"
          defaultChecked={campaign?.show_progress ?? true}
        />
        <span>Show fundraising progress publicly</span>
      </label>
    </>
  )
}

export async function DonationCampaignsAdminPage() {
  const campaigns = await getDonationCampaignsAdminData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Donations / Campaigns
          </span>
          <h1>Fundraising Campaigns</h1>
          <p>
            Publish unrestricted or designated fundraising opportunities.
          </p>
        </div>
        <Link className="button secondary" href="/admin/donations">
          Overview
        </Link>
      </div>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">New campaign</span>
            <h2>Create fundraising destination</h2>
          </div>
        </div>

        <form
          action={saveDonationCampaignAction}
          className="live-admin-form mobile-admin-form"
        >
          <CampaignFields />
          <div className="full">
            <button className="button" type="submit">
              Create campaign
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Existing campaigns
            </span>
            <h2>{campaigns.length} fundraising destinations</h2>
          </div>
        </div>

        <div className="donation-admin-campaign-list">
          {campaigns.map((campaign: any) => (
            <details
              className="donation-admin-campaign"
              key={campaign.id}
            >
              <summary>
                <div>
                  <strong>{campaign.title}</strong>
                  <small>
                    {campaign.slug} · {humanize(campaign.status)} ·{' '}
                    {humanize(campaign.fund_type)}
                  </small>
                </div>
                <span className={`pill ${
                  campaign.status === 'active' ? 'teal' : ''
                }`}>
                  {humanize(campaign.status)}
                </span>
              </summary>

              <form
                action={saveDonationCampaignAction}
                className="live-admin-form mobile-admin-form"
              >
                <CampaignFields campaign={campaign} />
                <div className="full">
                  <button className="button" type="submit">
                    Save campaign
                  </button>
                </div>
              </form>
            </details>
          ))}

          {!campaigns.length ? (
            <div className="live-empty-state compact">
              <strong>No donation campaigns found.</strong>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export async function DonationsListAdminPage({
  filters,
}: {
  filters: {
    status?: string
    campaign?: string
    q?: string
    page?: string
  }
}) {
  const data = await getDonationListData(filters)

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Donations / Transactions
          </span>
          <h1>Donations</h1>
          <p>
            Review donation intents and confirmed fundraising payments.
          </p>
        </div>
        <Link className="button secondary" href="/admin/donations">
          Overview
        </Link>
      </div>

      <form
        className="panel live-admin-form mobile-admin-form"
        method="get"
      >
        <label>
          Status
          <select name="status" defaultValue={data.status}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="payment_pending">Payment pending</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label>
          Campaign
          <select name="campaign" defaultValue={data.campaign}>
            <option value="">All campaigns</option>
            {data.campaigns.map((campaign: any) => (
              <option value={campaign.id} key={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </label>

        <label className="full">
          Donation reference
          <input
            name="q"
            defaultValue={data.q}
            placeholder="DON-26-..."
          />
        </label>

        <div className="full v2-admin-page-actions">
          <button className="button" type="submit">
            Apply filters
          </button>
          <Link
            className="button secondary"
            href="/admin/donations/donations"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Donation records</h2>
            <span className="live-data-badge">
              {data.totalCount.toLocaleString()} RECORDS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Donor</th>
                <th>Campaign</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Receipt email</th>
                <th>Created / paid</th>
              </tr>
            </thead>
            <tbody>
              {data.donations.map((row: any) => {
                const campaign = campaignOf(row)

                return (
                  <tr key={row.id}>
                    <td><strong>{row.donation_number}</strong></td>
                    <td>
                      <strong>{donorDisplay(row)}</strong>
                      <small>
                        {row.is_anonymous
                          ? 'Anonymous'
                          : row.donor_email ||
                            row.donor_phone ||
                            humanize(row.donor_type)}
                      </small>
                    </td>
                    <td>
                      <strong>{campaign?.title ?? '—'}</strong>
                      <small>{humanize(campaign?.fund_type)}</small>
                    </td>
                    <td>{money(row.amount, row.currency)}</td>
                    <td>
                      <span className={`pill ${
                        row.status === 'succeeded'
                          ? 'teal'
                          : row.status === 'failed'
                            ? 'coral'
                            : ''
                      }`}>
                        {humanize(row.status)}
                      </span>
                    </td>
                    <td>
                      {row.receipt_email_sent_at
                        ? dateTime(row.receipt_email_sent_at)
                        : row.receipt_email_error
                          ? `Failed: ${row.receipt_email_error}`
                          : '—'}
                    </td>
                    <td>
                      <strong>{dateTime(row.created_at)}</strong>
                      <small>
                        Paid: {dateTime(row.paid_at)}
                      </small>
                    </td>
                  </tr>
                )
              })}

              {!data.donations.length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="live-empty-state compact">
                      <strong>No donations match these filters.</strong>
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
                href={donationListHref(
                  {
                    status: data.status,
                    campaign: data.campaign,
                    q: data.q,
                  },
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
                href={donationListHref(
                  {
                    status: data.status,
                    campaign: data.campaign,
                    q: data.q,
                  },
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

export async function DonationDonorsAdminPage() {
  const donors = await getDonationDonorsData()

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Donations / Donors
          </span>
          <h1>Donor Directory</h1>
          <p>
            Non-anonymous supporters grouped by their available contact
            information. Anonymous donations are intentionally excluded.
          </p>
        </div>
        <Link className="button secondary" href="/admin/donations">
          Overview
        </Link>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Supporters</h2>
            <span className="live-data-badge">
              {donors.length.toLocaleString()} DONORS
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Donations</th>
                <th>Total given</th>
                <th>Last donation</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((donor) => (
                <tr key={donor.key}>
                  <td><strong>{donor.name}</strong></td>
                  <td>{humanize(donor.donorType)}</td>
                  <td>
                    <strong>{donor.email || donor.phone || '—'}</strong>
                    {donor.email && donor.phone ? (
                      <small>{donor.phone}</small>
                    ) : null}
                  </td>
                  <td>{donor.donationCount.toLocaleString()}</td>
                  <td>
                    {Object.entries(donor.totalByCurrency).map(
                      ([currency, amount]) => (
                        <div key={currency}>
                          {money(amount, currency)}
                        </div>
                      ),
                    )}
                  </td>
                  <td>{dateTime(donor.lastDonationAt)}</td>
                </tr>
              ))}

              {!donors.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="live-empty-state compact">
                      <strong>No non-anonymous donors yet.</strong>
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

export async function DonationReportsAdminPage({
  filters,
}: {
  filters: { from?: string; to?: string }
}) {
  const data = await getDonationReportsData(filters)
  const firstCurrency = data.byCurrency[0] as any | undefined

  return (
    <div className="portal-content v2-admin-page mobile-admin-page">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Donations / Reports
          </span>
          <h1>Fundraising Reports</h1>
          <p>
            Successful donation performance by campaign, payment method,
            donor type and currency.
          </p>
        </div>

        <div className="v2-admin-page-actions">
          <a
            className="button"
            href={reportExportHref(data.from, data.to)}
          >
            Export CSV
          </a>
          <Link className="button secondary" href="/admin/donations">
            Overview
          </Link>
        </div>
      </div>

      <form
        className="panel live-admin-form mobile-admin-form"
        method="get"
      >
        <label>
          From
          <input name="from" type="date" defaultValue={data.from} />
        </label>
        <label>
          To
          <input name="to" type="date" defaultValue={data.to} />
        </label>
        <div className="full v2-admin-page-actions">
          <button className="button" type="submit">
            Apply date range
          </button>
          <Link
            className="button secondary"
            href="/admin/donations/reports"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="v2-admin-stats mobile-admin-stats">
        <article>
          <span>Successful donations</span>
          <strong>{data.donationCount.toLocaleString()}</strong>
          <small>Within selected period</small>
        </article>
        <article>
          <span>Total raised</span>
          <strong>
            {firstCurrency
              ? money(firstCurrency.amount, firstCurrency.currency)
              : 'NLe 0.00'}
          </strong>
          <small>Successful contributions</small>
        </article>
        <article>
          <span>Campaigns represented</span>
          <strong>{data.byCampaign.length.toLocaleString()}</strong>
          <small>Funds receiving successful donations</small>
        </article>
      </div>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <h2>By campaign</h2>
        </div>
        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Fund type</th>
                <th>Donations</th>
                <th>Raised</th>
              </tr>
            </thead>
            <tbody>
              {data.byCampaign.map((row: any) => (
                <tr key={`${row.campaign_id}:${row.currency}`}>
                  <td>{row.campaign_title}</td>
                  <td>{humanize(row.fund_type)}</td>
                  <td>{Number(row.count ?? 0).toLocaleString()}</td>
                  <td>{money(row.amount, row.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <h2>By payment method</h2>
        </div>
        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Currency</th>
                <th>Donations</th>
                <th>Raised</th>
              </tr>
            </thead>
            <tbody>
              {data.byMethod.map((row: any) => (
                <tr key={`${row.payment_method}:${row.currency}`}>
                  <td>{methodLabel(row.payment_method)}</td>
                  <td>{row.currency}</td>
                  <td>{Number(row.count ?? 0).toLocaleString()}</td>
                  <td>{money(row.amount, row.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
