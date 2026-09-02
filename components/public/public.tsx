'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  ChevronRight,
  FileText,
  MapPin,
  Menu,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from 'lucide-react'
import { nominees, events, eventDetails } from '@/lib/mock-data'
import { Brand } from '@/components/brand/brand'

export function Pill({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

export function Button({ children, onClick, secondary = false }: { children: React.ReactNode; onClick?: () => void; secondary?: boolean }) {
  return <button onClick={onClick} className={secondary ? 'button secondary' : 'button'}>{children}</button>
}

const primaryNav = [
  ['About', '/about'],
  ['Programs', '/programs'],
  ['Awards', '/awards'],
  ['Nominees', '/nominees'],
  ['Events', '/events'],
  ['News', '/news'],
] as const

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header v2-site-header">
      <Link href="/" aria-label="Girl Pikin For Betteh Foundation home"><Brand /></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {primaryNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <div className="header-actions">
        <Link className="portal-link" href="/nominee">Nominee Portal</Link>
        <Link className="button" href="/vote">Vote Now <ArrowUpRight size={14} /></Link>
      </div>
      <button className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div className="mobile-nav v2-mobile-nav" role="dialog" aria-label="Mobile navigation">
          {primaryNav.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
          <Link href="/vote" onClick={() => setOpen(false)}>Vote</Link>
          <Link href="/gallery" onClick={() => setOpen(false)}>Gallery</Link>
          <Link href="/partners" onClick={() => setOpen(false)}>Partners</Link>
          <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
          <div className="mobile-nav-actions">
            <Link className="button secondary" href="/nominee" onClick={() => setOpen(false)}>Nominee Portal</Link>
            <Link className="button" href="/vote" onClick={() => setOpen(false)}>Vote Now</Link>
          </div>
        </div>
      )}
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="footer v2-footer">
      <div className="footer-brand">
        <Brand />
        <p>Programmes, awards, events and public engagement in one structured digital experience.</p>
      </div>
      <div className="footer-links">
        <strong>Organization</strong>
        <Link href="/about">About</Link>
        <Link href="/programs">Programs</Link>
        <Link href="/news">News</Link>
        <Link href="/contact">Contact</Link>
      </div>
      <div className="footer-links">
        <strong>Participation</strong>
        <Link href="/awards">Awards</Link>
        <Link href="/nominees">Nominees</Link>
        <Link href="/vote">Vote</Link>
        <Link href="/events">Events</Link>
      </div>
      <div className="footer-links">
        <strong>More</strong>
        <Link href="/gallery">Gallery</Link>
        <Link href="/partners">Partners</Link>
        <Link href="/nominee">Nominee Portal</Link>
      </div>
      <div className="footer-bottom"><small>© 2026 Girl Pikin For Betteh Foundation</small><small>Frontend preview · Live data integration pending</small></div>
    </footer>
  )
}

export function SectionHeading({ label, title, copy }: { label: string; title: React.ReactNode; copy?: string }) {
  return (
    <div className="section-heading v2-section-heading">
      <div><Pill>{label}</Pill><h2>{title}</h2></div>
      {copy && <p>{copy}</p>}
    </div>
  )
}

export function NomineeCard({ nominee = nominees[0] }: { nominee?: typeof nominees[number] }) {
  return (
    <article className="panel nominee-card v2-nominee-card">
      <div className="v2-nominee-identity">
        <div className={`mini-avatar ${nominee.color}`}>{nominee.initials}</div>
        <div><span className="nominee-code">{nominee.code}</span><h3>{nominee.name}</h3><p>{nominee.institution}</p></div>
      </div>
      <div className="v2-card-divider" />
      <div className="v2-nominee-meta"><span>Category</span><strong>{nominee.category.replace('Demo category: ', '')}</strong></div>
      <div className="card-actions">
        <Link className="text-button" href={`/nominees/${nominee.code}`}>View profile <ArrowUpRight size={14}/></Link>
        <Link className="button compact" href={`/vote/${nominee.code}`}>Vote</Link>
      </div>
    </article>
  )
}

export function EventCard({ event = events[0] }: { event?: typeof events[number] }) {
  const [day, month, year] = event.date.split(' ')
  return (
    <article className="event-card v2-event-card">
      <div className="event-card-top">
        <div className="event-date"><b>{day}</b><span>{month}<small>{year}</small></span></div>
        <Pill tone={event.demo ? '' : 'gold'}>{event.type}</Pill>
      </div>
      <h3>{event.title}</h3>
      <p><MapPin size={14}/> {event.location}</p>
      <footer>
        <span>{event.price}</span>
        <Link aria-label={`View ${event.title}`} href={`/events/${event.slug}`}>View event <ArrowUpRight size={14}/></Link>
      </footer>
    </article>
  )
}

export function PublicHome() {
  return (
    <>
      <PublicHeader />
      <main id="top" className="v2-public-home">
        <section className="v2-home-hero">
          <div className="v2-home-hero-copy">
            <span className="v2-overline">Girl Pikin For Betteh Foundation</span>
            <h1>A trusted digital platform for programmes, recognition and events.</h1>
            <p>Bringing public information, award participation, voting, ticketing and event operations into one structured experience.</p>
            <div className="hero-actions">
              <Link className="button" href="/about">Explore the Foundation <ArrowRight size={15}/></Link>
              <Link className="button secondary" href="/awards">View Awards</Link>
            </div>
            <div className="v2-hero-proof">
              <span><ShieldCheck size={16}/><b>Structured</b><small>Clear public and operational workflows</small></span>
              <span><Users size={16}/><b>Accessible</b><small>Designed for public and participant use</small></span>
              <span><FileText size={16}/><b>Accountable</b><small>Built for records, reporting and review</small></span>
            </div>
          </div>

          <aside className="v2-campaign-feature">
            <div className="v2-campaign-image-wrap">
              <Image src={eventDetails.artwork} alt="50 Most Influential Students' Award – Sierra Leone 2026 official campaign artwork" fill sizes="(max-width: 800px) 100vw, 520px" className="v2-campaign-image" priority />
            </div>
            <div className="v2-campaign-summary">
              <div><span className="v2-overline light">Current award · 2026</span><h2>{eventDetails.title}</h2><p>{eventDetails.edition}</p></div>
              <div className="v2-campaign-details">
                <span><CalendarDays size={16}/><small>Date</small><b>{eventDetails.date}</b></span>
                <span><MapPin size={16}/><small>Venue</small><b>{eventDetails.location}</b></span>
              </div>
              <div className="v2-campaign-actions"><Link href="/awards/50misa-2026">Award details <ArrowUpRight size={14}/></Link><Link href="/events/50misa-2026/tickets">Ceremony tickets <Ticket size={14}/></Link></div>
            </div>
          </aside>
        </section>

        <section className="v2-institution-strip" aria-label="Platform sections">
          <span>Programs & Initiatives</span><i />
          <span>Awards & Recognition</span><i />
          <span>Public Voting</span><i />
          <span>Events & Ticketing</span>
        </section>

        <section className="section v2-current-priority">
          <div className="v2-priority-copy">
            <Pill tone="gold">Current Priority</Pill>
            <h2>50 Most Influential Students&apos; Award – Sierra Leone</h2>
            <p>The 6th Edition has a dedicated experience for nominee discovery, public voting and ceremony ticketing.</p>
            <div className="v2-priority-actions"><Link className="button" href="/nominees">Browse nominees</Link><Link className="button secondary" href="/vote">Public voting</Link></div>
          </div>
          <dl className="v2-priority-facts">
            <div><dt>Edition</dt><dd>6th Edition</dd></div>
            <div><dt>Ceremony</dt><dd>21 November 2026</dd></div>
            <div><dt>Venue</dt><dd>Freetown City Hall</dd></div>
            <div><dt>Time</dt><dd>5:00 PM</dd></div>
          </dl>
        </section>

        <section className="section section-surface v2-section-surface">
          <SectionHeading label="Nominee Directory" title={<>Featured nominees</>} copy="Representative nominee records are shown as frontend demo data until live records are connected."/>
          <div className="nominee-grid v2-nominee-grid">{nominees.map(n => <NomineeCard key={n.code} nominee={n}/>)}</div>
          <div className="section-cta"><Link className="button secondary" href="/nominees">View nominee directory <ChevronRight size={15}/></Link></div>
        </section>

        <section className="section v2-capabilities-section">
          <SectionHeading label="Platform Areas" title={<>One organization. Clear digital experiences.</>} copy="The public website and operational portals share one consistent design and information structure." />
          <div className="v2-capability-grid">
            <article><span><FileText size={19}/></span><small>01</small><h3>Programs</h3><p>Publish approved programme information, updates and media in a structured format.</p><Link href="/programs">Explore programs <ArrowUpRight size={14}/></Link></article>
            <article><span><Award size={19}/></span><small>02</small><h3>Awards</h3><p>Manage award editions, nominees, voting, results and campaign information.</p><Link href="/awards">Explore awards <ArrowUpRight size={14}/></Link></article>
            <article><span><CalendarDays size={19}/></span><small>03</small><h3>Events</h3><p>Present events, ticket tiers and event-day check-in through a connected flow.</p><Link href="/events">Explore events <ArrowUpRight size={14}/></Link></article>
          </div>
        </section>

        <section className="section v2-events-section">
          <SectionHeading label="Events" title={<>Upcoming activity</>} copy="The confirmed 2026 award ceremony is shown alongside clearly labelled demo event content." />
          <div className="event-grid">{events.slice(0, 3).map(e => <EventCard event={e} key={e.slug}/>)}</div>
        </section>

        <section className="v2-closing-cta">
          <div><span className="v2-overline light">Participation</span><h2>Explore the work. Join an event. Support a nominee.</h2><p>Use the platform to discover public information and participate in active programmes and award experiences.</p></div>
          <div><Link className="button light" href="/vote">Vote now</Link><Link className="v2-light-link" href="/contact">Contact the foundation <ArrowUpRight size={14}/></Link></div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
