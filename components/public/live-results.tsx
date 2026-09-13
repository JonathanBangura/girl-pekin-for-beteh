import Link from 'next/link'
import {
  Award,
  CheckCircle2,
  Trophy,
} from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
  SectionHeading,
} from '@/components/public/public'
import {
  getLatestPublishedResults,
  getPublishedResultsBySlug,
} from '@/lib/results/public-data'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (!parts.length) return 'W'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase()
}

function publishedDate(value?: string | null) {
  if (!value) return 'Published'

  return new Intl.DateTimeFormat('en-SL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export async function PublicResultsPage({
  slug,
}: {
  slug?: string
}) {
  const data = slug
    ? await getPublishedResultsBySlug(slug)
    : await getLatestPublishedResults()

  if (!data) {
    return (
      <>
        <PublicHeader />
        <main>
          <section className="page-hero v2-page-hero">
            <span className="v2-overline">
              Certified Results
            </span>
            <h1>No certified results are public yet.</h1>
            <p>
              Results appear here only after voting is closed,
              reconciled, manually reviewed, approved and published.
            </p>
            <Link className="button secondary" href="/awards">
              View Awards
            </Link>
          </section>
        </main>
        <PublicFooter />
      </>
    )
  }

  return (
    <>
      <PublicHeader />

      <main>
        <section className="page-hero v2-page-hero">
          <span className="v2-overline">
            Certified Award Results
          </span>
          <Pill tone="gold">
            {data.edition.edition_label} · {data.edition.year}
          </Pill>
          <h1>{data.award.name}</h1>
          <p>
            These results completed the platform&apos;s
            reconciliation, review and approval workflow before
            publication.
          </p>

          <div className="v2-admin-page-actions">
            <span className="pill teal">
              <CheckCircle2 size={14} /> Certified
            </span>
            <span className="pill">
              Published{' '}
              {publishedDate(
                data.certification.published_at,
              )}
            </span>
          </div>
        </section>

        <section className="section section-surface v2-section-surface">
          <SectionHeading
            label="Official Winners"
            title={<>Certified category winners</>}
            copy="Vote rank was reviewed as evidence. Winner selection was explicitly certified and was not performed automatically by the system."
          />

          <div className="live-public-nominee-grid">
            {data.winners.map((winner: any) => (
              <article
                className="live-public-nominee-card"
                key={winner.id}
              >
                <div
                  className="live-public-nominee-image"
                  style={
                    winner.nominee.photo_url
                      ? {
                          backgroundImage: `url("${winner.nominee.photo_url}")`,
                        }
                      : undefined
                  }
                >
                  {!winner.nominee.photo_url ? (
                    <span>
                      {initials(winner.nominee.full_name)}
                    </span>
                  ) : null}
                </div>

                <div className="live-public-nominee-body">
                  <Pill tone="gold">
                    <Trophy size={13} /> Winner
                  </Pill>

                  <span className="v2-overline">
                    {winner.category.name}
                  </span>

                  <h3>{winner.nominee.full_name}</h3>

                  <p>
                    {winner.nominee.institution ||
                      'Institution not provided'}
                  </p>

                  <div className="live-public-nominee-meta">
                    <span>
                      {winner.nominee.nominee_code}
                    </span>
                    <span>
                      Certified votes:{' '}
                      {winner.certified_votes.toLocaleString()}
                    </span>
                  </div>

                  {winner.decision_note ? (
                    <small>{winner.decision_note}</small>
                  ) : null}

                </div>
              </article>
            ))}
          </div>

          <div className="section-cta">
            <Link className="button secondary" href="/awards">
              <Award size={15} /> Back to Awards
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  )
}
