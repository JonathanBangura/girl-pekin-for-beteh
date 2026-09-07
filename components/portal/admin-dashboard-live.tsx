import Link from 'next/link'
import {
  ArrowUpRight,
  Award,
  CalendarDays,
  FileText,
  RefreshCw,
  ScanLine,
  Ticket,
  Trophy,
  Vote,
  WalletCards,
} from 'lucide-react'
import { getAdminDashboardData } from '@/lib/admin/live-data'

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function time(value: string) {
  return new Intl.DateTimeFormat('en-SL', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export async function AdminDashboardLive() {
  const data = await getAdminDashboardData()

  const operationalStats = [
    [
      'Active award edition',
      data.activeEdition?.year?.toString() ?? '—',
      data.activeEdition?.edition_label ?? 'No active edition',
    ],
    ['Published nominees', data.publishedNominees.toLocaleString(), 'Live data'],
    ['Vote orders', data.voteOrders.toLocaleString(), 'Live data'],
    ['Ticket orders', data.ticketOrders.toLocaleString(), 'Live data'],
  ]

  const queueCount =
    data.pendingNominees + data.pendingPayments + data.pendingTicketOrders

  return (
    <div className="portal-content v2-dashboard-page">
      <div className="v2-dashboard-head">
        <div>
          <span className="v2-admin-eyebrow">Operations Overview</span>
          <h1>Administration dashboard</h1>
          <p>
            Live operational data from the platform database for awards, voting,
            ticketing and payments.
          </p>
        </div>
        <Link className="button" href="/admin/awards/nominees">
          Manage nominees
        </Link>
      </div>

      <div className="v2-kpi-grid">
        {operationalStats.map(([label, value, note]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>

      <div className="v2-dashboard-grid admin-dashboard-grid">
        <section className="panel v2-dashboard-card">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">Current edition</span>
              <h2>
                {data.activeEdition
                  ? `${data.activeEdition.edition_label} · ${data.activeEdition.year}`
                  : 'No active edition'}
              </h2>
            </div>
            <span className="live-data-badge">LIVE DATA</span>
          </div>

          {data.activeEdition ? (
            <div className="live-edition-summary">
              <div>
                <span>Status</span>
                <strong>{humanize(data.activeEdition.status)}</strong>
              </div>
              <div>
                <span>Leaderboard</span>
                <strong>
                  {humanize(data.activeEdition.leaderboard_visibility)}
                </strong>
              </div>
              <div>
                <span>Voting opens</span>
                <strong>
                  {data.activeEdition.voting_starts_at
                    ? new Intl.DateTimeFormat('en-SL', {
                        dateStyle: 'medium',
                      }).format(new Date(data.activeEdition.voting_starts_at))
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Voting closes</span>
                <strong>
                  {data.activeEdition.voting_ends_at
                    ? new Intl.DateTimeFormat('en-SL', {
                        dateStyle: 'medium',
                      }).format(new Date(data.activeEdition.voting_ends_at))
                    : '—'}
                </strong>
              </div>
            </div>
          ) : (
            <p className="live-empty-copy">
              Create or publish an award edition to begin operations.
            </p>
          )}
        </section>

        <section className="panel v2-attention-card">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">Needs attention</span>
              <h2>Operational queue</h2>
            </div>
            <span className="v2-queue-count">{queueCount}</span>
          </div>

          <div className="v2-attention-list">
            <Link href="/admin/awards/nominees">
              <FileText size={16} />
              <span>
                <b>{data.pendingNominees} nominees awaiting review</b>
                <small>Awards / Nominees</small>
              </span>
              <ArrowUpRight size={14} />
            </Link>

            <Link href="/admin/finance/payments">
              <RefreshCw size={16} />
              <span>
                <b>{data.pendingPayments} payments pending processing</b>
                <small>Finance / Payments</small>
              </span>
              <ArrowUpRight size={14} />
            </Link>

            <Link href="/admin/events/orders">
              <Ticket size={16} />
              <span>
                <b>{data.pendingTicketOrders} ticket orders awaiting payment</b>
                <small>Events / Orders</small>
              </span>
              <ArrowUpRight size={14} />
            </Link>

            <Link href="/admin/awards/results">
              <Trophy size={16} />
              <span>
                <b>
                  Results status:{' '}
                  {data.activeEdition
                    ? humanize(data.activeEdition.status)
                    : 'Not configured'}
                </b>
                <small>Awards / Results</small>
              </span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      </div>

      <section className="panel v2-dashboard-actions">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">Operations</span>
            <h2>Primary workspaces</h2>
          </div>
          <Link className="text-button" href="/admin/audit">
            View audit log <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="v2-quick-action-grid admin-actions">
          <Link href="/admin/awards">
            <Award size={17} />
            <span>
              <b>Awards</b>
              <small>Editions, categories and nominees</small>
            </span>
          </Link>
          <Link href="/admin/awards/voting">
            <Vote size={17} />
            <span>
              <b>Voting</b>
              <small>Monitor vote activity</small>
            </span>
          </Link>
          <Link href="/admin/events">
            <CalendarDays size={17} />
            <span>
              <b>Events</b>
              <small>Ticketing and check-ins</small>
            </span>
          </Link>
          <Link href="/admin/finance">
            <WalletCards size={17} />
            <span>
              <b>Finance</b>
              <small>Payments and reconciliation</small>
            </span>
          </Link>
          <Link href="/scan">
            <ScanLine size={17} />
            <span>
              <b>Event Scanner</b>
              <small>Open check-in interface</small>
            </span>
          </Link>
        </div>
      </section>

      <section className="panel v2-recent-activity">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">Recent activity</span>
            <h2>Latest operational records</h2>
          </div>
          <span className="live-data-badge">AUDIT LOG</span>
        </div>

        {data.recentActivity.length ? (
          <div className="v2-activity-table">
            <div className="head">
              <span>Activity</span>
              <span>Module</span>
              <span>Reference</span>
              <span>Time</span>
            </div>

            {data.recentActivity.map((entry) => (
              <div key={entry.id}>
                <span>{humanize(entry.action)}</span>
                <span>{humanize(entry.entity_type)}</span>
                <b>{entry.entity_id?.slice(0, 8) ?? '—'}</b>
                <small>{time(entry.created_at)}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="live-empty-state">
            <strong>No operational activity recorded yet.</strong>
            <p>
              Real audit entries will appear here as administrative workflows
              are connected.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
