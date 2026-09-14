import Link from 'next/link'
import {
  Bell,
  Download,
  ExternalLink,
  FileText,
  QrCode,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { Pill } from '@/components/public/public'
import { NomineeCampaignActions } from './nominee-campaign-actions'
import { updateMyNomineeProfile } from '@/lib/nominee/actions'
import {
  getMyNomineeAnnouncementsData,
  getMyNomineeCampaignData,
  getMyNomineePassData,
  getMyNomineePerformanceData,
  getMyNomineeProfileData,
  getMyNomineeResourcesData,
} from '@/lib/nominee/live-data'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (!parts.length) return 'N'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase()
}

function humanize(value?: string | null) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    )
}

function dateTime(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

function fileSize(bytes?: number | null) {
  if (!bytes) return 'File'
  if (bytes < 1024 * 1024) {
    return `${Math.max(
      1,
      Math.round(bytes / 1024),
    )} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function NoLinkedNominee() {
  return (
    <div className="portal-content v2-nominee-workspace">
      <div className="v2-admin-page-head">
        <div>
          <span className="v2-admin-eyebrow">
            Nominee Portal
          </span>
          <h1>No linked nominee profile</h1>
          <p>
            An administrator must link this login to an approved
            nominee record before this workspace can be used.
          </p>
        </div>
      </div>

      <section className="panel live-empty-state">
        <strong>Your account is not linked yet.</strong>
        <p>
          Contact the award administrator using the email address
          for this login.
        </p>
      </section>
    </div>
  )
}

function PageHead({
  code,
  title,
  copy,
  action,
}: {
  code?: string
  title: string
  copy: string
  action?: React.ReactNode
}) {
  return (
    <div className="v2-admin-page-head">
      <div>
        <span className="v2-admin-eyebrow">
          Nominee Portal
          {code ? ` · ${code}` : ''}
        </span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>

      {action}
    </div>
  )
}

export async function NomineeProfileLivePage({
  updated,
  error,
}: {
  updated?: string
  error?: string
}) {
  const data = await getMyNomineeProfileData()

  if (!data.nominee) return <NoLinkedNominee />

  const nominee = data.nominee

  return (
    <div className="portal-content v2-nominee-workspace">
      <PageHead
        code={nominee.nominee_code}
        title="Profile"
        copy="Review your official nominee identity and maintain the limited public details available for self-service."
        action={
          nominee.status === 'published' &&
          nominee.is_public ? (
            <Link
              className="button"
              href={`/nominees/${nominee.nominee_code}`}
              target="_blank"
            >
              Public Profile <ExternalLink size={14} />
            </Link>
          ) : undefined
        }
      />

      {updated === '1' ? (
        <div className="live-form-message success">
          Your editable public profile details were updated.
        </div>
      ) : null}

      {error ? (
        <div className="live-form-message error">
          {error === 'too_long'
            ? 'The institution or biography is too long.'
            : error === 'profile_locked'
              ? 'This nominee profile is locked because of its current status.'
              : error === 'nominee_not_found'
                ? 'Your linked nominee record could not be found.'
                : 'The profile could not be updated.'}
        </div>
      ) : null}

      <div className="v2-nominee-profile-layout">
        <aside className="v2-nominee-summary-card">
          <div
            className="v2-account-avatar large live-portal-avatar"
            style={
              nominee.photo_url
                ? {
                    backgroundImage: `url("${nominee.photo_url}")`,
                  }
                : undefined
            }
          >
            {!nominee.photo_url
              ? initials(nominee.full_name)
              : null}
          </div>

          <h2>{nominee.full_name}</h2>
          <p>
            {nominee.institution ||
              'Institution not provided'}
          </p>

          <Pill
            tone={
              nominee.status === 'published'
                ? 'teal'
                : ''
            }
          >
            {humanize(nominee.status)}
          </Pill>

          <dl>
            <div>
              <dt>Nominee code</dt>
              <dd>{nominee.nominee_code}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{data.category?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Edition</dt>
              <dd>
                {data.edition
                  ? `${data.edition.edition_label} · ${data.edition.year}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </aside>

        <section className="panel v2-profile-form-preview">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">
                Profile information
              </span>
              <h2>Public details</h2>
            </div>
            <UserRound size={19} />
          </div>

          <form
            action={updateMyNomineeProfile}
            className="live-admin-form mobile-admin-form"
          >
            <label>
              Full name
              <input
                value={nominee.full_name}
                readOnly
                disabled
              />
            </label>

            <label>
              Institution
              <input
                name="institution"
                defaultValue={nominee.institution ?? ''}
                maxLength={300}
              />
            </label>

            <label>
              Nominee code
              <input
                value={nominee.nominee_code}
                readOnly
                disabled
              />
            </label>

            <label>
              Category
              <input
                value={data.category?.name ?? '—'}
                readOnly
                disabled
              />
            </label>

            <label className="full">
              Biography
              <textarea
                name="bio"
                rows={7}
                maxLength={3000}
                defaultValue={nominee.bio ?? ''}
                placeholder="Add the approved public biography you want visitors to see."
              />
            </label>

            <div className="full">
              <button className="button" type="submit">
                Save Editable Details
              </button>
            </div>
          </form>

          <p className="v2-form-note">
            Name, nominee code, category, publication status,
            profile photo, votes and results remain
            administrator-controlled.
          </p>
        </section>
      </div>
    </div>
  )
}

export async function NomineeCampaignLivePage() {
  const data = await getMyNomineeCampaignData()

  if (!data.nominee) return <NoLinkedNominee />

  const nominee = data.nominee
  const link = `/vote/${nominee.nominee_code}`

  return (
    <div className="portal-content v2-nominee-workspace">
      <PageHead
        code={nominee.nominee_code}
        title="Campaign Tools"
        copy="Use your personal voting link, secure QR code and approved campaign materials."
      />

      <div className="v2-campaign-tools-layout">
        <section className="v2-campaign-link-card">
          <span className="v2-admin-eyebrow light">
            Personal voting link
          </span>
          <h2>{link}</h2>
          <p>
            Share this link or QR code in approved campaign
            communication. It opens your live voting page.
          </p>

          <NomineeCampaignActions
            nomineeCode={nominee.nominee_code}
          />

          <div
            style={{
              marginTop: 24,
              background: 'white',
              width: 220,
              maxWidth: '100%',
              padding: 12,
              borderRadius: 12,
            }}
          >
            {/* The endpoint is authenticated and returns this nominee's QR. */}
            <img
              src="/api/nominee/campaign/qr"
              alt="Personal voting QR code"
              width="196"
              height="196"
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
              }}
            />
          </div>

          <dl>
            <div>
              <dt>Nominee code</dt>
              <dd>{nominee.nominee_code}</dd>
            </div>
            <div>
              <dt>Edition</dt>
              <dd>
                {data.edition
                  ? `${data.edition.edition_label} · ${data.edition.year}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel v2-campaign-assets">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">
                Campaign assets
              </span>
              <h2>Approved materials</h2>
            </div>
            <Pill tone="teal">
              {data.campaignResources.length} available
            </Pill>
          </div>

          {data.campaignResources.length ? (
            <div className="v2-asset-grid">
              {data.campaignResources.map((resource) => (
                <a
                  key={resource.id}
                  href={`/api/nominee/resources/${resource.id}`}
                >
                  <FileText size={20} />
                  <span>
                    <b>{resource.title}</b>
                    <small>
                      {resource.original_filename ||
                        humanize(resource.resource_type)}
                      {' · '}
                      {fileSize(resource.file_size_bytes)}
                    </small>
                  </span>
                  <Download size={14} />
                </a>
              ))}
            </div>
          ) : (
            <div className="live-empty-state compact">
              <strong>
                No campaign assets have been published yet.
              </strong>
              <p>
                Your personal voting link and QR code remain
                available above.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export async function NomineePerformanceLivePage() {
  const data = await getMyNomineePerformanceData()

  if (!data.nominee) return <NoLinkedNominee />

  const last14 = data.daily.slice(-14)
  const maxVotes = Math.max(
    1,
    ...last14.map((row) =>
      Math.max(0, row.net_votes),
    ),
  )

  return (
    <div className="portal-content v2-nominee-workspace">
      <PageHead
        code={data.nominee.nominee_code}
        title="Performance"
        copy="View your own aggregate vote performance. Voter identities and payment details are never exposed here."
      />

      <div className="v2-kpi-grid nominee-kpis">
        <article>
          <span>Total votes</span>
          <strong>
            {data.totalVotes.toLocaleString()}
          </strong>
          <small>Append-only vote ledger total</small>
        </article>

        <article>
          <span>Current rank</span>
          <strong>
            {data.rank ? `#${data.rank}` : '—'}
          </strong>
          <small>
            {data.edition?.leaderboard_visibility ===
            'hidden'
              ? 'Leaderboard is hidden'
              : 'Based on current visible leaderboard'}
          </small>
        </article>

        <article>
          <span>Net votes today</span>
          <strong>
            {data.votesToday.toLocaleString()}
          </strong>
          <small>Payments minus reversals/refunds</small>
        </article>

        <article>
          <span>Net votes · 7 days</span>
          <strong>
            {data.votesThisWeek.toLocaleString()}
          </strong>
          <small>Last seven calendar days</small>
        </article>
      </div>

      <div className="v2-dashboard-grid">
        <section className="panel v2-dashboard-card v2-chart-card">
          <div className="v2-card-head">
            <div>
              <span className="v2-admin-eyebrow">
                Vote performance
              </span>
              <h2>Recent net-vote trend</h2>
            </div>
            <Pill>Last 14 active days</Pill>
          </div>

          {last14.length ? (
            <>
              <div className="v2-bars">
                {last14.map((row, index) => (
                  <i
                    key={row.vote_date}
                    title={`${row.vote_date}: ${row.net_votes} net votes`}
                    className={
                      index === last14.length - 1
                        ? 'current'
                        : ''
                    }
                    style={{
                      height: `${Math.max(
                        5,
                        (Math.max(0, row.net_votes) /
                          maxVotes) *
                          100,
                      )}%`,
                    }}
                  />
                ))}
              </div>

              <div className="v2-chart-footer">
                <span>{last14[0]?.vote_date}</span>
                <span>
                  {last14[last14.length - 1]?.vote_date}
                </span>
              </div>
            </>
          ) : (
            <div className="live-empty-state compact">
              <strong>No vote activity yet.</strong>
            </div>
          )}
        </section>

        <aside className="panel v2-performance-breakdown">
          <span className="v2-admin-eyebrow">
            Privacy-safe metrics
          </span>
          <h2>What is shown here</h2>

          <div>
            <span>Vote totals</span>
            <strong>Aggregate only</strong>
            <small>No voter names or payment data</small>
          </div>

          <div>
            <span>Leaderboard</span>
            <strong>
              {humanize(
                data.edition?.leaderboard_visibility,
              )}
            </strong>
            <small>
              Rank disappears when leaderboard visibility is
              hidden.
            </small>
          </div>

          <div>
            <span>Voting lifecycle</span>
            <strong>
              {humanize(data.edition?.status)}
            </strong>
            <small>
              {dateTime(data.edition?.voting_ends_at)}
            </small>
          </div>
        </aside>
      </div>
    </div>
  )
}

export async function NomineeAnnouncementsLivePage() {
  const data = await getMyNomineeAnnouncementsData()

  if (!data.nominee) return <NoLinkedNominee />

  return (
    <div className="portal-content v2-nominee-workspace">
      <PageHead
        code={data.nominee.nominee_code}
        title="Announcements"
        copy="Official updates published to nominees in your award edition."
      />

      <section className="panel v2-announcements-panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Announcements
            </span>
            <h2>Latest updates</h2>
          </div>
          <Pill tone="teal">
            {data.announcements.length} available
          </Pill>
        </div>

        {data.announcements.length ? (
          <div className="v2-announcement-list">
            {data.announcements.map((announcement) => (
              <article key={announcement.id}>
                <span className="v2-announcement-icon">
                  <Bell size={16} />
                </span>

                <div>
                  <small>
                    {humanize(announcement.priority)}
                  </small>
                  <h3>{announcement.title}</h3>
                  <p>{announcement.body}</p>
                </div>

                <time>
                  {announcement.published_at
                    ? new Intl.DateTimeFormat('en-SL', {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'Africa/Freetown',
                      }).format(
                        new Date(
                          announcement.published_at,
                        ),
                      )
                    : ''}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <div className="live-empty-state compact">
            <strong>No announcements right now.</strong>
          </div>
        )}
      </section>
    </div>
  )
}

export async function NomineeDocumentsLivePage() {
  const data = await getMyNomineeResourcesData()

  if (!data.nominee) return <NoLinkedNominee />

  return (
    <div className="portal-content v2-nominee-workspace">
      <PageHead
        code={data.nominee.nominee_code}
        title="Documents"
        copy="Private nominee resources published for your current award edition."
      />

      <section className="panel v2-documents-panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Documents
            </span>
            <h2>Available resources</h2>
          </div>
          <Pill tone="teal">
            {data.resources.length} available
          </Pill>
        </div>

        {data.resources.length ? (
          <div className="v2-document-table">
            <div className="head">
              <span>Document</span>
              <span>Type</span>
              <span>Size</span>
              <span>Action</span>
            </div>

            {data.resources.map((resource) => (
              <div key={resource.id}>
                <span>
                  <FileText size={17} />
                  <b>{resource.title}</b>
                </span>

                <span>
                  {humanize(resource.resource_type)}
                </span>

                <span>
                  {fileSize(resource.file_size_bytes)}
                </span>

                <a
                  className="text-button"
                  href={`/api/nominee/resources/${resource.id}`}
                >
                  <Download size={14} /> Download
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="live-empty-state compact">
            <strong>
              No documents have been published yet.
            </strong>
          </div>
        )}
      </section>
    </div>
  )
}

export async function NomineeCeremonyPassLivePage() {
  const data = await getMyNomineePassData()

  if (!data.nominee) return <NoLinkedNominee />

  const active =
    data.pass?.status === 'active' &&
    data.ticket?.status === 'active'

  return (
    <div className="portal-content v2-nominee-workspace">
      <PageHead
        code={data.nominee.nominee_code}
        title="Ceremony Pass"
        copy="Your individual nominee ceremony access pass, when issued by the event team."
      />

      {active && data.passEvent && data.ticket ? (
        <div className="v2-pass-layout">
          <section className="v2-digital-pass">
            <div className="v2-pass-top">
              <span className="v2-admin-eyebrow light">
                Digital Ceremony Pass
              </span>
              <span>
                {data.edition?.edition_label} ·{' '}
                {data.edition?.year}
              </span>
            </div>

            <h2>
              {data.award?.name ??
                data.passEvent.title}
            </h2>

            <p>
              {dateTime(data.passEvent.starts_at)}
              {' · '}
              {data.passEvent.venue ||
                'Venue to be confirmed'}
            </p>

            <div className="v2-pass-identity">
              <div className="v2-account-avatar">
                {initials(data.nominee.full_name)}
              </div>

              <div>
                <small>Nominee</small>
                <strong>
                  {data.nominee.full_name}
                </strong>
                <span>
                  {data.nominee.nominee_code}
                </span>
              </div>

              <div className="v2-pass-qr">
                <img
                  src="/api/nominee/pass/qr"
                  alt="Ceremony pass QR code"
                  width="120"
                  height="120"
                  style={{
                    background: 'white',
                    padding: 6,
                    display: 'block',
                  }}
                />
                <small>Scan at event check-in</small>
              </div>
            </div>

            <div className="v2-pass-ticket">
              <span>Individual Ticket</span>
              <strong>{data.ticket.ticket_code}</strong>
            </div>
          </section>

          <aside className="panel v2-pass-notes">
            <span className="v2-admin-eyebrow">
              Event information
            </span>
            <h2>Keep this pass accessible.</h2>
            <p>
              This is a real complimentary ticket connected to
              the event scanner. It admits one nominee once.
            </p>
            <ul>
              <li>
                Present this QR code at event check-in.
              </li>
              <li>
                The same ticket cannot be used twice.
              </li>
              <li>
                A revoked or cancelled pass will be rejected
                by the scanner.
              </li>
            </ul>
          </aside>
        </div>
      ) : data.pass?.status === 'revoked' ||
        data.ticket?.status === 'cancelled' ? (
        <section className="panel live-empty-state">
          <strong>This ceremony pass was revoked.</strong>
          <p>
            {data.pass?.revoke_reason ||
              'Contact the event team if you believe this is incorrect.'}
          </p>
        </section>
      ) : (
        <section className="panel live-empty-state">
          <QrCode size={30} />
          <strong>
            Your ceremony pass has not been issued yet.
          </strong>
          <p>
            Event staff will issue the individual pass when
            nominee access is approved for the ceremony.
          </p>
        </section>
      )}
    </div>
  )
}
