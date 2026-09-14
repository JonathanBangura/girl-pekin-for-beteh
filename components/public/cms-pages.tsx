import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
  SectionHeading,
} from '@/components/public/public'
import { LiveNomineeCard } from '@/components/public/live-awards'
import { submitPublicContactForm } from '@/lib/public/contact-actions'
import {
  getPublicHomeData,
  getPublishedGallery,
  getPublishedNews,
  getPublishedNewsBySlug,
  getPublishedPartners,
  getPublishedProgramBySlug,
  getPublishedPrograms,
  getPublishedSitePage,
  getPublicSiteSettings,
} from '@/lib/public/cms-data'

function formatDate(value?: string | null) {
  if (!value) return null

  return new Intl.DateTimeFormat('en-SL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

function formatEventDate(value?: string | null) {
  if (!value) return 'Date to be confirmed'

  return new Intl.DateTimeFormat('en-SL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

function shell(children: React.ReactNode) {
  return (
    <>
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </>
  )
}

function EmptyPublicState({
  title,
  copy,
}: {
  title: string
  copy: string
}) {
  return (
    <div className="live-public-empty cms-empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  )
}

export async function PublicHomeLivePage() {
  const data = await getPublicHomeData()

  const heroTitle =
    data.page?.title ||
    'Girl Pikin For Betteh Foundation'
  const heroSummary =
    data.page?.summary ||
    'Explore official programmes, awards, events and public participation opportunities.'
  const heroEyebrow =
    data.page?.eyebrow || 'Girl Pikin For Betteh Foundation'

  const award = data.award
  const event = award?.event ?? null
  const featuredHref = event
    ? `/awards/${event.slug}`
    : award?.award?.slug
      ? `/awards/${award.award.slug}`
      : '/awards'

  return shell(
    <>
      <section className="v2-home-hero v3-home-hero cms-home-hero">
        <div className="v2-home-hero-copy v3-home-hero-copy">
          <span className="v3-kicker">
            <i /> {heroEyebrow}
          </span>
          <h1>{heroTitle}</h1>
          <p>{heroSummary}</p>

          <div className="hero-actions v3-hero-actions">
            <Link
              className="button v3-gold-button"
              href={data.page?.cta_href || '/programs'}
            >
              {data.page?.cta_label || 'Explore our work'}{' '}
              <ArrowRight size={15} />
            </Link>

            {award ? (
              <Link
                className="button v3-outline-button"
                href={featuredHref}
              >
                Current award <ArrowUpRight size={14} />
              </Link>
            ) : null}
          </div>
        </div>

        {award ? (
          <aside className="v2-campaign-feature v3-campaign-feature">
            <div
              className="v3-gold-offset"
              aria-hidden="true"
            />

            <div className="cms-home-feature-media">
              {event?.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={`${award.award.name} campaign artwork`}
                />
              ) : (
                <div className="cms-image-placeholder dark">
                  <Award size={42} />
                  <span>
                    {award.edition.edition_label}
                  </span>
                </div>
              )}
            </div>

            <div className="v2-campaign-summary v3-campaign-summary">
              <div>
                <span className="v2-overline light">
                  Current award
                </span>
                <h2>{award.award.name}</h2>
                <p>
                  {award.edition.edition_label} ·{' '}
                  {award.edition.year}
                </p>
              </div>

              {event ? (
                <div className="v2-campaign-details">
                  <span>
                    <CalendarDays size={16} />
                    <small>Date</small>
                    <b>
                      {formatDate(event.starts_at) ||
                        'To be confirmed'}
                    </b>
                  </span>
                  <span>
                    <MapPin size={16} />
                    <small>Venue</small>
                    <b>
                      {event.venue ||
                        'To be confirmed'}
                    </b>
                  </span>
                </div>
              ) : null}

              <div className="v2-campaign-actions">
                <Link href={featuredHref}>
                  Award details{' '}
                  <ArrowUpRight size={14} />
                </Link>

                {event ? (
                  <Link
                    href={`/events/${event.slug}/tickets`}
                  >
                    Ceremony tickets{' '}
                    <ArrowUpRight size={14} />
                  </Link>
                ) : null}
              </div>
            </div>
          </aside>
        ) : (
          <aside className="cms-home-feature-empty">
            <Award size={38} />
            <strong>
              Published award information will appear
              here.
            </strong>
          </aside>
        )}
      </section>

      {data.page?.body ? (
        <section className="section cms-intro-section">
          <div className="cms-prose">
            <span className="v2-overline">
              Foundation
            </span>
            <p>{data.page.body}</p>
            {data.page.secondary_body ? (
              <p>{data.page.secondary_body}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="section section-surface v2-section-surface">
        <SectionHeading
          label="Programs & Initiatives"
          title={<>Current programme work</>}
          copy="Only programmes published by the foundation appear here."
        />

        {data.programs.length ? (
          <div className="cms-card-grid">
            {data.programs.map((program) => (
              <article
                key={program.id}
                className="panel cms-content-card"
              >
                {program.cover_image_url ? (
                  <img
                    src={program.cover_image_url}
                    alt=""
                    className="cms-card-image"
                  />
                ) : null}
                <Pill>Program</Pill>
                <h3>{program.title}</h3>
                <p>
                  {program.summary ||
                    'Open the programme page for details.'}
                </p>
                <Link
                  className="text-button"
                  href={`/programs/${program.slug}`}
                >
                  View programme{' '}
                  <ArrowUpRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPublicState
            title="No programmes are published yet."
            copy="Approved programme information will appear here when published."
          />
        )}

        <div className="section-cta">
          <Link
            className="button secondary"
            href="/programs"
          >
            View all programs
          </Link>
        </div>
      </section>

      {award?.nominees?.length ? (
        <section className="section">
          <SectionHeading
            label="Nominees"
            title={<>Published nominees</>}
            copy="Browse nominees published for the current public award edition."
          />

          <div className="live-public-nominee-grid">
            {award.nominees
              .slice(0, 6)
              .map((nominee) => (
                <LiveNomineeCard
                  key={nominee.id}
                  nominee={nominee}
                />
              ))}
          </div>

          <div className="section-cta">
            <Link
              className="button secondary"
              href="/nominees"
            >
              View nominee directory
            </Link>
          </div>
        </section>
      ) : null}

      <section className="section section-surface v2-section-surface">
        <SectionHeading
          label="News & Updates"
          title={<>Latest published updates</>}
          copy="Official news and programme updates from the foundation."
        />

        {data.news.length ? (
          <div className="cms-news-grid">
            {data.news.map((post) => (
              <article
                className="cms-news-card"
                key={post.id}
              >
                {post.cover_image_url ? (
                  <img
                    src={post.cover_image_url}
                    alt=""
                  />
                ) : null}
                <small>
                  {formatDate(post.published_at)}
                </small>
                <h3>{post.title}</h3>
                <p>{post.excerpt || ''}</p>
                <Link
                  className="text-button"
                  href={`/news/${post.slug}`}
                >
                  Read update{' '}
                  <ArrowUpRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPublicState
            title="No news is published yet."
            copy="Official updates will appear here after publication."
          />
        )}
      </section>

      {data.partners.length ? (
        <section className="section">
          <SectionHeading
            label="Partners"
            title={<>Published partners & supporters</>}
          />

          <div className="cms-partner-strip">
            {data.partners.map((partner) => (
              <div
                className="cms-partner-item"
                key={partner.id}
              >
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={`${partner.name} logo`}
                  />
                ) : (
                  <strong>{partner.name}</strong>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="v2-closing-cta">
        <div>
          <span className="v2-overline light">
            Participation
          </span>
          <h2>
            Discover the work and participate through
            the platform.
          </h2>
          <p>
            Explore published programmes, awards,
            nominees and events.
          </p>
        </div>
        <div>
          <Link className="button light" href="/awards">
            Explore awards
          </Link>
          <Link
            className="v2-light-link"
            href="/contact"
          >
            Contact the foundation{' '}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </>,
  )
}

export async function AboutLivePage() {
  const page = await getPublishedSitePage('about')

  return shell(
    <>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">
          {page?.eyebrow || 'About the Foundation'}
        </span>
        <h1>
          {page?.title ||
            'About Girl Pikin For Betteh Foundation'}
        </h1>
        <p>
          {page?.summary ||
            'Official organizational information published by the foundation.'}
        </p>
      </section>

      <section className="section cms-editorial-layout">
        {page?.body || page?.secondary_body ? (
          <article className="cms-prose panel">
            {page.body ? <p>{page.body}</p> : null}
            {page.secondary_body ? (
              <p>{page.secondary_body}</p>
            ) : null}
          </article>
        ) : (
          <EmptyPublicState
            title="Additional organizational information has not been published yet."
            copy="This page will update when approved content is published."
          />
        )}

        {page?.cta_label && page?.cta_href ? (
          <Link
            className="button"
            href={page.cta_href}
          >
            {page.cta_label}{' '}
            <ArrowUpRight size={14} />
          </Link>
        ) : null}
      </section>
    </>,
  )
}

export async function ProgramsLivePage() {
  const programs = await getPublishedPrograms()

  return shell(
    <>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">
          Programs & Initiatives
        </span>
        <h1>Published programme work</h1>
        <p>
          Explore programmes and initiatives officially
          published by the foundation.
        </p>
      </section>

      <section className="section">
        {programs.length ? (
          <div className="v2-program-list cms-program-list">
            {programs.map((program, index) => (
              <article key={program.id}>
                <span className="v2-program-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div>
                  <Pill>Published</Pill>
                  <h2>{program.title}</h2>
                  <p>{program.summary || ''}</p>
                </div>

                <Link
                  className="text-button"
                  href={`/programs/${program.slug}`}
                >
                  View programme{' '}
                  <ArrowUpRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPublicState
            title="No programmes are published yet."
            copy="Approved programme information will appear here after publication."
          />
        )}
      </section>
    </>,
  )
}

export async function ProgramDetailLivePage({
  slug,
}: {
  slug: string
}) {
  const program =
    await getPublishedProgramBySlug(slug)

  if (!program) notFound()

  return shell(
    <>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">Program</span>
        <h1>{program.title}</h1>
        <p>{program.summary || ''}</p>
      </section>

      <section className="section cms-editorial-layout">
        {program.cover_image_url ? (
          <img
            className="cms-feature-image"
            src={program.cover_image_url}
            alt=""
          />
        ) : null}

        {program.body ? (
          <article className="cms-prose panel">
            <p>{program.body}</p>
          </article>
        ) : null}

        <Link
          className="button secondary"
          href="/programs"
        >
          Back to programs
        </Link>
      </section>
    </>,
  )
}

export async function NewsLivePage() {
  const posts = await getPublishedNews()

  return shell(
    <>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">
          News & Updates
        </span>
        <h1>Official updates</h1>
        <p>
          Published announcements, programme updates and
          foundation news.
        </p>
      </section>

      <section className="section">
        {posts.length ? (
          <div className="cms-news-grid">
            {posts.map((post) => (
              <article
                className="cms-news-card"
                key={post.id}
              >
                {post.cover_image_url ? (
                  <img
                    src={post.cover_image_url}
                    alt=""
                  />
                ) : null}
                <small>
                  {formatDate(post.published_at)}
                </small>
                <h2>{post.title}</h2>
                <p>{post.excerpt || ''}</p>
                <Link
                  className="text-button"
                  href={`/news/${post.slug}`}
                >
                  Read update{' '}
                  <ArrowUpRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPublicState
            title="No news is published yet."
            copy="Official updates will appear here after publication."
          />
        )}
      </section>
    </>,
  )
}

export async function NewsDetailLivePage({
  slug,
}: {
  slug: string
}) {
  const post = await getPublishedNewsBySlug(slug)

  if (!post) notFound()

  return shell(
    <>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">
          News & Updates
        </span>
        <h1>{post.title}</h1>
        <p>{post.excerpt || ''}</p>
        {post.published_at ? (
          <small className="cms-published-date">
            {formatDate(post.published_at)}
          </small>
        ) : null}
      </section>

      <section className="section cms-editorial-layout">
        {post.cover_image_url ? (
          <img
            className="cms-feature-image"
            src={post.cover_image_url}
            alt=""
          />
        ) : null}

        {post.body ? (
          <article className="cms-prose panel">
            <p>{post.body}</p>
          </article>
        ) : null}

        <Link
          className="button secondary"
          href="/news"
        >
          Back to news
        </Link>
      </section>
    </>,
  )
}

export async function GalleryLivePage() {
  const items = await getPublishedGallery()

  return shell(
    <>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">
          Media Gallery
        </span>
        <h1>Published activity highlights</h1>
        <p>
          Images published by the foundation from programmes
          and events.
        </p>
      </section>

      <section className="section">
        {items.length ? (
          <div className="cms-gallery-grid">
            {items.map((item) => (
              <figure key={item.id}>
                <img
                  src={item.image_url}
                  alt={item.title}
                />
                <figcaption>
                  <strong>{item.title}</strong>
                  {item.caption ? (
                    <span>{item.caption}</span>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyPublicState
            title="No gallery images are published yet."
            copy="Approved media will appear here when published."
          />
        )}
      </section>
    </>,
  )
}

export async function PartnersLivePage() {
  const partners = await getPublishedPartners()

  return shell(
    <>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">
          Partners & Sponsors
        </span>
        <h1>Published partners and supporters</h1>
        <p>
          Only organizations approved for public display
          appear here.
        </p>
      </section>

      <section className="section">
        {partners.length ? (
          <div className="cms-partner-grid">
            {partners.map((partner) => (
              <article
                className="panel"
                key={partner.id}
              >
                <div className="cms-partner-logo">
                  {partner.logo_url ? (
                    <img
                      src={partner.logo_url}
                      alt={`${partner.name} logo`}
                    />
                  ) : (
                    <strong>{partner.name}</strong>
                  )}
                </div>

                <Pill>
                  {partner.partner_type || 'Partner'}
                </Pill>
                <h3>{partner.name}</h3>
                {partner.description ? (
                  <p>{partner.description}</p>
                ) : null}

                {partner.website_url ? (
                  <a
                    className="text-button"
                    href={partner.website_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit website{' '}
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyPublicState
            title="No partner information is published yet."
            copy="Approved partner information will appear here after publication."
          />
        )}
      </section>
    </>,
  )
}

export async function ContactLivePage({
  sent,
  error,
}: {
  sent?: string
  error?: string
}) {
  const [page, settings] = await Promise.all([
    getPublishedSitePage('contact'),
    getPublicSiteSettings(),
  ])

  return shell(
    <>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">
          {page?.eyebrow || 'Contact'}
        </span>
        <h1>
          {page?.title || 'Contact the Foundation'}
        </h1>
        <p>
          {page?.summary ||
            'Send an enquiry or use the official contact details published here.'}
        </p>
      </section>

      <section className="section v2-contact-layout">
        <form
          action={submitPublicContactForm}
          className="panel v2-contact-form cms-contact-form"
        >
          <div>
            <span className="v2-overline">
              Enquiry form
            </span>
            <h2>Send a message</h2>
          </div>

          {sent === '1' ? (
            <div className="live-form-message success">
              Your message was submitted successfully.
            </div>
          ) : null}

          {error ? (
            <div className="live-form-message error">
              {error === 'invalid_form'
                ? 'Check the form fields and try again.'
                : 'Your message could not be submitted. Please try again.'}
            </div>
          ) : null}

          <input
            type="text"
            name="company_website"
            tabIndex={-1}
            autoComplete="off"
            className="cms-honeypot"
            aria-hidden="true"
          />

          <label>
            Name
            <input name="name" required />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              required
            />
          </label>

          <label>
            Phone
            <input name="phone" type="tel" />
          </label>

          <label>
            Subject
            <input name="subject" />
          </label>

          <label>
            Message
            <textarea
              name="message"
              rows={6}
              required
            />
          </label>

          <button className="button" type="submit">
            Submit enquiry
          </button>
        </form>

        <aside className="v2-contact-aside">
          <span className="v2-overline light">
            Contact information
          </span>
          <h2>
            Girl Pikin For Betteh Foundation
          </h2>

          {page?.body ? <p>{page.body}</p> : null}

          {settings?.contact_email ? (
            <p>
              <Mail size={16} />
              <a
                href={`mailto:${settings.contact_email}`}
              >
                {settings.contact_email}
              </a>
            </p>
          ) : null}

          {settings?.contact_phone ? (
            <p>
              <Phone size={16} />
              <a
                href={`tel:${settings.contact_phone}`}
              >
                {settings.contact_phone}
              </a>
            </p>
          ) : null}

          {settings?.contact_address ? (
            <p>
              <MapPin size={16} />
              {settings.contact_address}
            </p>
          ) : null}

          <div className="cms-social-links">
            {settings?.instagram_url ? (
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            ) : null}
            {settings?.facebook_url ? (
              <a
                href={settings.facebook_url}
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
            ) : null}
            {settings?.x_url ? (
              <a
                href={settings.x_url}
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
            ) : null}
          </div>
        </aside>
      </section>
    </>,
  )
}

export function PublicEventSummary({
  title,
  startsAt,
  venue,
}: {
  title: string
  startsAt?: string | null
  venue?: string | null
}) {
  return (
    <article className="cms-event-summary">
      <h3>{title}</h3>
      <p>
        <CalendarDays size={14} />
        {formatEventDate(startsAt)}
      </p>
      <p>
        <MapPin size={14} />
        {venue || 'Venue to be confirmed'}
      </p>
    </article>
  )
}
