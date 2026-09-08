import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock3,
  MapPin,
  Ticket,
  Trophy,
  Vote,
} from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
  SectionHeading,
} from '@/components/public/public'
import {
  getPublicAwardEditionBySlug,
  getPublicAwardsIndex,
  getPublicNomineeByCode,
  getPublicNomineeDirectory,
  type PublicNominee,
} from '@/lib/public/live-awards-data'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'N'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatDate(value?: string | null) {
  if (!value) return 'To be confirmed'
  return new Intl.DateTimeFormat('en-SL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value?: string | null) {
  if (!value) return 'To be confirmed'
  return new Intl.DateTimeFormat('en-SL', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function currency(value: number | null, code = 'SLE') {
  if (value == null) return 'By Donation'
  const prefix = code === 'SLE' ? 'NLe' : code
  return `${prefix} ${Number(value).toLocaleString()}`
}

function votingIsOpen(status: string) {
  return status === 'voting_open'
}

export function LiveNomineeCard({ nominee }: { nominee: PublicNominee }) {
  return (
    <article className="live-public-nominee-card">
      <div
        className="live-public-nominee-image"
        style={
          nominee.photo_url
            ? { backgroundImage: `url("${nominee.photo_url}")` }
            : undefined
        }
      >
        {!nominee.photo_url && <span>{initials(nominee.full_name)}</span>}
      </div>

      <div className="live-public-nominee-body">
        <Pill>{nominee.category_name}</Pill>
        <h3>{nominee.full_name}</h3>
        <p>{nominee.institution || 'Institution not provided'}</p>

        <div className="live-public-nominee-meta">
          <span>{nominee.nominee_code}</span>
          {nominee.rank_position ? (
            <span>Rank #{nominee.rank_position}</span>
          ) : null}
        </div>

        <Link
          className="text-button"
          href={`/nominees/${nominee.nominee_code}`}
        >
          View profile <ArrowUpRight size={14} />
        </Link>
      </div>
    </article>
  )
}

export async function PublicAwardsLivePage() {
  const data = await getPublicAwardsIndex()

  if (!data) {
    return (
      <>
        <PublicHeader />
        <main>
          <section className="page-hero v2-page-hero">
            <span className="v2-overline">Awards & Recognition</span>
            <h1>No public award edition is available yet.</h1>
            <p>
              Published award information will appear here when an edition is
              made public.
            </p>
          </section>
        </main>
        <PublicFooter />
      </>
    )
  }

  const artwork =
    data.event?.cover_image_url ||
    (data.event?.slug === '50misa-2026'
      ? '/campaigns/50misa-2026-official.png'
      : null)

  return (
    <>
      <PublicHeader />
      <main>
        <section className="v2-awards-index-hero">
          <div>
            <span className="v2-overline light">Awards & Recognition</span>
            <Pill tone="gold">
              {data.edition.edition_label} · {data.edition.year}
            </Pill>
            <h1>{data.award.name}</h1>
            <p>
              {data.award.summary ||
                'Explore the current award edition, nominees and ceremony information.'}
            </p>

            <div className="hero-actions">
              {data.event ? (
                <Link
                  className="button light"
                  href={`/awards/${data.event.slug}`}
                >
                  View edition <ArrowUpRight size={15} />
                </Link>
              ) : null}

              <Link className="v2-light-outline" href="/nominees">
                View nominees
              </Link>
            </div>

            {data.event && (
              <div className="v2-awards-mini-facts">
                <span>
                  <CalendarDays size={15} />
                  {formatDate(data.event.starts_at)}
                </span>
                <span>
                  <MapPin size={15} />
                  {data.event.venue || 'Venue to be confirmed'}
                </span>
              </div>
            )}
          </div>

          <div className="v2-awards-poster live-award-poster">
            {artwork ? (
              <Image
                src={artwork}
                alt={`${data.award.name} campaign artwork`}
                fill
                sizes="(max-width: 900px) 100vw, 420px"
                className="v2-award-artwork-image"
                priority
              />
            ) : (
              <div className="live-award-poster-placeholder">
                <Trophy size={40} />
                <span>{data.edition.edition_label}</span>
              </div>
            )}
          </div>
        </section>

        <section className="section section-surface v2-section-surface">
          <SectionHeading
            label="Nominee Directory"
            title={<>Published nominees</>}
            copy="Only approved nominees published for the current edition appear here."
          />

          {data.nominees.length ? (
            <div className="live-public-nominee-grid">
              {data.nominees.slice(0, 6).map((nominee) => (
                <LiveNomineeCard nominee={nominee} key={nominee.id} />
              ))}
            </div>
          ) : (
            <div className="live-public-empty">
              Published nominees will appear here once they are approved.
            </div>
          )}

          <div className="section-cta">
            <Link className="button secondary" href="/nominees">
              View nominee directory
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

export async function PublicAwardEditionLivePage({
  slug,
}: {
  slug: string
}) {
  const data = await getPublicAwardEditionBySlug(slug)

  if (!data) notFound()

  const artwork =
    data.event?.cover_image_url ||
    (data.event?.slug === '50misa-2026'
      ? '/campaigns/50misa-2026-official.png'
      : null)

  return (
    <>
      <PublicHeader />
      <main>
        <section className="v2-award-hero">
          <div className="v2-award-hero-copy">
            <span className="v2-overline light">
              Current Award · {data.edition.year}
            </span>
            <Pill tone="gold">{data.edition.edition_label}</Pill>
            <h1>{data.award.name}</h1>
            <p>
              {data.edition.description ||
                data.award.summary ||
                'Current award edition information.'}
            </p>

            <div className="hero-actions">
              {votingIsOpen(data.edition.status) ? (
                <Link className="button light" href="/nominees">
                  Vote now <ArrowUpRight size={15} />
                </Link>
              ) : (
                <span className="live-voting-closed">Voting is closed</span>
              )}

              {data.event && (
                <Link
                  className="v2-light-outline"
                  href={`/events/${data.event.slug}/tickets`}
                >
                  Ceremony tickets <Ticket size={15} />
                </Link>
              )}
            </div>

            <div className="v2-award-facts">
              <span>
                <CalendarDays size={16} />
                <small>Date</small>
                <b>{formatDate(data.event?.starts_at)}</b>
              </span>
              <span>
                <Clock3 size={16} />
                <small>Time</small>
                <b>{formatTime(data.event?.starts_at)}</b>
              </span>
              <span>
                <MapPin size={16} />
                <small>Venue</small>
                <b>{data.event?.venue || 'To be confirmed'}</b>
              </span>
            </div>
          </div>

          <div className="v2-award-artwork live-award-poster">
            {artwork ? (
              <Image
                src={artwork}
                alt={`${data.award.name} campaign artwork`}
                fill
                sizes="(max-width: 900px) 100vw, 480px"
                className="v2-award-artwork-image"
                priority
              />
            ) : (
              <div className="live-award-poster-placeholder">
                <Trophy size={44} />
                <span>{data.edition.edition_label}</span>
              </div>
            )}
          </div>
        </section>

        <section className="section section-surface v2-section-surface">
          <SectionHeading
            label="Nominee Directory"
            title={<>Published nominees</>}
            copy="The directory below is connected directly to approved Supabase nominee records."
          />

          {data.nominees.length ? (
            <div className="live-public-nominee-grid">
              {data.nominees.map((nominee) => (
                <LiveNomineeCard nominee={nominee} key={nominee.id} />
              ))}
            </div>
          ) : (
            <div className="live-public-empty">
              No nominees have been published for this edition yet.
            </div>
          )}
        </section>

        <section className="section v2-ticket-tier-section">
          <SectionHeading
            label="Ceremony Tickets"
            title={<>Ticket tiers</>}
            copy="Ticket tiers and pricing are read directly from the current event configuration."
          />

          {data.ticketTypes.length ? (
            <div className="v2-ticket-tier-table">
              {data.ticketTypes.map((tier, index) => (
                <div key={tier.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{tier.name}</strong>
                  <b>
                    {tier.pricing_type === 'donation'
                      ? 'By Donation'
                      : currency(tier.price, tier.currency)}
                  </b>
                  <small>{tier.pricing_type}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="live-public-empty">
              Ticket sales are not configured for this event.
            </div>
          )}

          {data.event && data.ticketTypes.length ? (
            <div className="section-cta">
              <Link
                className="button"
                href={`/events/${data.event.slug}/tickets`}
              >
                Choose ceremony tickets
              </Link>
            </div>
          ) : null}
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

export async function PublicNomineeDirectoryLivePage({
  query,
  category,
}: {
  query?: string
  category?: string
}) {
  const data = await getPublicNomineeDirectory({ query, category })

  return (
    <>
      <PublicHeader />
      <main>
        <section className="page-hero v2-page-hero">
          <span className="v2-overline">
            {data.edition
              ? `${data.edition.year} Nominee Directory`
              : 'Nominee Directory'}
          </span>
          <h1>Discover published award nominees.</h1>
          <p>Search by nominee name, nominee code, institution or category.</p>
        </section>

        <section className="section v2-directory-section">
          <form className="live-directory-toolbar" method="get">
            <label>
              Search nominees
              <input
                name="q"
                defaultValue={query ?? ''}
                placeholder="Name, code, institution or category"
              />
            </label>

            <label>
              Category
              <select name="category" defaultValue={category ?? ''}>
                <option value="">All categories</option>
                {data.categories.map((item) => (
                  <option value={item.slug} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <button className="button secondary" type="submit">Search</button>

            {(query || category) && (
              <Link className="text-button" href="/nominees">
                Clear filters
              </Link>
            )}
          </form>

          <div className="live-directory-count">
            {data.nominees.length} nominee{data.nominees.length === 1 ? '' : 's'}
          </div>

          {data.nominees.length ? (
            <div className="live-public-nominee-grid">
              {data.nominees.map((nominee) => (
                <LiveNomineeCard nominee={nominee} key={nominee.id} />
              ))}
            </div>
          ) : (
            <div className="live-public-empty">
              No published nominees match the current search.
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

export async function PublicNomineeProfileLivePage({
  code,
}: {
  code: string
}) {
  const nominee = await getPublicNomineeByCode(code)
  if (!nominee) notFound()

  const data = await getPublicAwardsIndex()
  if (!data) notFound()

  const isVotingOpen = votingIsOpen(data.edition.status)

  return (
    <>
      <PublicHeader />
      <main>
        <section className="v2-nominee-profile-hero">
          <div
            className="v2-profile-monogram live-profile-photo"
            style={
              nominee.photo_url
                ? { backgroundImage: `url("${nominee.photo_url}")` }
                : undefined
            }
          >
            {!nominee.photo_url && initials(nominee.full_name)}
          </div>

          <div className="v2-profile-heading">
            <span className="v2-overline">
              Nominee Profile · {nominee.nominee_code}
            </span>
            <h1>{nominee.full_name}</h1>
            <p>
              <Building2 size={15} />
              {nominee.institution || 'Institution not provided'}
            </p>

            <div className="v2-profile-tags">
              <Pill>{nominee.category_name}</Pill>
              <Pill tone="teal">Published nominee</Pill>
            </div>
          </div>
        </section>

        <section className="section v2-profile-content">
          <article className="v2-profile-main">
            <span className="v2-overline">Nominee overview</span>
            <h2>Profile information</h2>
            <p>
              {nominee.bio ||
                'No public biography has been added for this nominee yet.'}
            </p>

            <div className="v2-profile-info-grid">
              <div>
                <span>Nominee code</span>
                <strong>{nominee.nominee_code}</strong>
              </div>
              <div>
                <span>Institution</span>
                <strong>{nominee.institution || '—'}</strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{nominee.category_name}</strong>
              </div>
              <div>
                <span>Rank</span>
                <strong>
                  {nominee.rank_position ? `#${nominee.rank_position}` : 'Not displayed'}
                </strong>
              </div>
            </div>
          </article>

          <aside className="v2-vote-aside">
            <span className="v2-overline light">Public Voting</span>

            {isVotingOpen ? (
              <>
                <h2>Support this nominee.</h2>
                <p>Continue to the dedicated public voting checkout.</p>
                <Link
                  className="button light"
                  href={`/vote/${nominee.nominee_code}`}
                >
                  <Vote size={15} />
                  Vote for {nominee.full_name.split(' ')[0]}
                </Link>
              </>
            ) : (
              <>
                <h2>Voting is closed.</h2>
                <p>The voting window for this edition is no longer open.</p>
              </>
            )}

            <Link className="v2-light-link" href="/nominees">
              Back to nominees <ArrowUpRight size={14} />
            </Link>
          </aside>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
