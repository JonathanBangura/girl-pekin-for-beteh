import Link from 'next/link'
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Share2,
  UserRound,
} from 'lucide-react'
import { getMyNomineeDashboardData } from '@/lib/nominee/live-data'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'N'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function NomineeDashboardLive() {
  const data = await getMyNomineeDashboardData()

  if (!data?.nominee) {
    return (
      <div className="portal-content v2-dashboard-page">
        <div className="v2-dashboard-head">
          <div>
            <span className="v2-admin-eyebrow">Nominee Portal</span>
            <h1>Your account is not linked to a nominee record yet.</h1>
            <p>
              Your nominee role is active, but an administrator must link this
              login to your nominee profile before campaign information can be
              displayed.
            </p>
          </div>
        </div>

        <section className="panel live-empty-state">
          <strong>No linked nominee profile</strong>
          <p>
            Contact the award administrator and provide the email address used
            for this login.
          </p>
        </section>
      </div>
    )
  }

  const nominee = data.nominee

  return (
    <div className="portal-content v2-dashboard-page">
      <div className="v2-dashboard-head">
        <div>
          <span className="v2-admin-eyebrow">
            Nominee Portal · {nominee.nominee_code}
          </span>
          <h1>Campaign dashboard</h1>
          <p>
            Live profile, publication and voting information for your linked
            nominee account.
          </p>
        </div>

        {nominee.status === 'published' && nominee.is_public ? (
          <Link
            className="button"
            href={`/nominees/${nominee.nominee_code}`}
          >
            View public profile <ArrowUpRight size={14} />
          </Link>
        ) : null}
      </div>

      <div className="v2-kpi-grid nominee-kpis">
        <article>
          <span>Total votes</span>
          <strong>{data.totalVotes.toLocaleString()}</strong>
          <small>Vote ledger total</small>
        </article>
        <article>
          <span>Current rank</span>
          <strong>{data.rank ? `#${data.rank}` : '—'}</strong>
          <small>Subject to leaderboard visibility</small>
        </article>
        <article>
          <span>Profile status</span>
          <strong className="live-kpi-text">{humanize(nominee.status)}</strong>
          <small>{nominee.is_public ? 'Public' : 'Not public'}</small>
        </article>
        <article>
          <span>Award edition</span>
          <strong className="live-kpi-text">{data.edition?.year ?? '—'}</strong>
          <small>{data.edition?.edition_label ?? '—'}</small>
        </article>
      </div>

      <div className="v2-dashboard-grid">
        <section className="panel v2-dashboard-card">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">Nominee profile</span>
              <h2>Profile information</h2>
            </div>
            <span className="live-data-badge">LIVE DATA</span>
          </div>

          <div className="live-nominee-portal-profile">
            <div
              className="v2-account-avatar live-portal-avatar"
              style={
                nominee.photo_url
                  ? { backgroundImage: `url("${nominee.photo_url}")` }
                  : undefined
              }
            >
              {!nominee.photo_url && initials(nominee.full_name)}
            </div>

            <div>
              <h3>{nominee.full_name}</h3>
              <p>{nominee.institution || 'Institution not provided'}</p>
              <dl>
                <div>
                  <dt>Category</dt>
                  <dd>{data.category?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt>Nominee code</dt>
                  <dd>{nominee.nominee_code}</dd>
                </div>
                <div>
                  <dt>Voting status</dt>
                  <dd>{data.edition ? humanize(data.edition.status) : '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <aside className="panel live-portal-event-card">
          <span className="v2-admin-eyebrow">Ceremony</span>
          <h2>{data.event?.title || 'Event information'}</h2>

          {data.event ? (
            <>
              <p>
                <CalendarDays size={16} />
                {data.event.starts_at
                  ? new Intl.DateTimeFormat('en-SL', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    }).format(new Date(data.event.starts_at))
                  : 'Date to be confirmed'}
              </p>
              <p>{data.event.venue || 'Venue to be confirmed'}</p>
            </>
          ) : (
            <p>Ceremony information has not been published yet.</p>
          )}
        </aside>
      </div>

      <section className="panel v2-dashboard-actions">
        <div>
          <span className="v2-admin-eyebrow">Workspace</span>
          <h2>Quick access</h2>
        </div>

        <div className="v2-quick-action-grid">
          <Link href="/nominee/profile">
            <UserRound size={17} />
            <span>
              <b>My Profile</b>
              <small>Review nominee information</small>
            </span>
          </Link>

          <Link href="/nominee/campaign">
            <Share2 size={17} />
            <span>
              <b>Campaign Tools</b>
              <small>Links, QR and campaign assets</small>
            </span>
          </Link>

          <Link href="/nominee/pass">
            <BadgeCheck size={17} />
            <span>
              <b>Ceremony Pass</b>
              <small>Event access information</small>
            </span>
          </Link>
        </div>
      </section>
    </div>
  )
}
