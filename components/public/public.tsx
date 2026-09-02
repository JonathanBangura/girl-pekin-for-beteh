'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  MapPin,
  Menu,
  ShieldCheck,
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
    <header className="site-header">
      <Link href="/" aria-label="Girl Pikin For Betteh Foundation home"><Brand /></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {primaryNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <div className="header-actions">
        <Link className="portal-link" href="/nominee">Nominee Portal</Link>
        <Link className="button" href="/vote">Vote Now <ArrowUpRight size={15} /></Link>
      </div>
      <button className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X size={23} /> : <Menu size={23} />}
      </button>
      {open && (
        <div className="mobile-nav" role="dialog" aria-label="Mobile navigation">
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
    <footer className="footer">
      <div className="footer-brand">
        <Brand />
        <p>A professional digital home for programmes, awards, events and community engagement.</p>
      </div>
      <div className="footer-links">
        <strong>Explore</strong>
        <Link href="/about">About</Link>
        <Link href="/programs">Programs</Link>
        <Link href="/awards">Awards</Link>
        <Link href="/events">Events</Link>
      </div>
      <div className="footer-links">
        <strong>Connect</strong>
        <Link href="/nominees">Nominees</Link>
        <Link href="/vote">Vote</Link>
        <Link href="/partners">Partners</Link>
        <Link href="/contact">Contact</Link>
      </div>
      <small>© 2026 Girl Pikin For Betteh Foundation · Frontend preview</small>
    </footer>
  )
}

export function SectionHeading({ label, title, copy }: { label: string; title: React.ReactNode; copy?: string }) {
  return (
    <div className="section-heading">
      <div><Pill>{label}</Pill><h2>{title}</h2></div>
      {copy && <p>{copy}</p>}
    </div>
  )
}

export function NomineeCard({ nominee = nominees[0] }: { nominee?: typeof nominees[number] }) {
  return (
    <article className="panel nominee-card">
      <div className="nominee-card-top">
        <div className={`mini-avatar ${nominee.color}`}>{nominee.initials}</div>
        <span className="nominee-code">{nominee.code}</span>
      </div>
      <Pill tone="teal">{nominee.category.replace('Mock category: ', '')}</Pill>
      <h3>{nominee.name}</h3>
      <p>{nominee.institution}</p>
      <div className="card-actions">
        <Link className="text-button" href={`/nominees/${nominee.code}`}>View profile <ArrowUpRight size={15}/></Link>
        <Link className="button compact" href={`/vote/${nominee.code}`}>Vote</Link>
      </div>
    </article>
  )
}

export function EventCard({ event = events[0] }: { event?: typeof events[number] }) {
  const [day, month] = event.date.split(' ')
  return (
    <article className="event-card">
      <div className="event-card-top">
        <div className="event-date"><b>{day}</b><span>{month}</span></div>
        <Pill>{event.type}</Pill>
      </div>
      <h3>{event.title}</h3>
      <p><MapPin size={15}/> {event.location}</p>
      <footer>
        <span>{event.price}</span>
        <Link aria-label={`View ${event.title}`} href={`/events/${event.slug}`}>View event <ArrowUpRight size={15}/></Link>
      </footer>
    </article>
  )
}

export function PublicHome() {
  return (
    <>
      <PublicHeader />
      <main id="top">
        <section className="hero professional-hero">
          <div className="hero-copy">
            <Pill tone="teal">Girl Pikin For Betteh Foundation</Pill>
            <h1>Opportunity, recognition and <em>meaningful impact.</em></h1>
            <p>A modern platform bringing the foundation’s programmes, awards, events and public engagement together in one trusted experience.</p>
            <div className="hero-actions">
              <Link className="button" href="/about">Explore the Foundation <ArrowRight size={16}/></Link>
              <Link className="button secondary" href="/awards">View Awards</Link>
            </div>
            <div className="hero-trust-row">
              <span><ShieldCheck size={16}/> Structured & transparent</span>
              <span><Users size={16}/> Community focused</span>
            </div>
          </div>

          <div className="hero-art">
            <div className="hero-feature">
              <div className="feature-header">
                <div>
                  <span className="feature-kicker">Featured · 2026</span>
                  <h2>{eventDetails.title}</h2>
                  <p>{eventDetails.edition}</p>
                </div>
                <div className="feature-seal"><Award size={23}/></div>
              </div>
              <div className="feature-meta-grid">
                <div className="feature-meta"><CalendarDays size={18}/><span><small>Date</small>{eventDetails.date}</span></div>
                <div className="feature-meta"><MapPin size={18}/><span><small>Venue</small>{eventDetails.location}</span></div>
              </div>
              <div className="feature-actions">
                <Link href="/awards/50misa-2026">Award details <ArrowUpRight size={15}/></Link>
                <Link className="button light" href="/vote">View nominees</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section focus-section" id="impact">
          <SectionHeading
            label="Platform focus"
            title={<>Built for <em>credible engagement.</em></>}
            copy="A clear and professional experience across the foundation’s public work, recognition programmes and events."
          />
          <div className="impact-grid professional-focus-grid">
            <article className="impact-card focus-card">
              <span className="focus-icon"><GraduationCap size={22}/></span>
              <span className="focus-number">01</span>
              <h3>Programs & Initiatives</h3>
              <p>Present programmes with clarity, context and structured information.</p>
              <Link href="/programs">Explore programs <ArrowUpRight size={15}/></Link>
            </article>
            <article className="impact-card focus-card">
              <span className="focus-icon"><Award size={22}/></span>
              <span className="focus-number">02</span>
              <h3>Awards & Recognition</h3>
              <p>Manage editions, nominees, public voting and results in one experience.</p>
              <Link href="/awards">Explore awards <ArrowUpRight size={15}/></Link>
            </article>
            <article className="impact-card focus-card">
              <span className="focus-icon"><CalendarDays size={22}/></span>
              <span className="focus-number">03</span>
              <h3>Events & Ticketing</h3>
              <p>Publish events, sell tickets and support secure event-day check-in.</p>
              <Link href="/events">Explore events <ArrowUpRight size={15}/></Link>
            </article>
          </div>
        </section>

        <section className="section section-surface">
          <SectionHeading label="2026 award" title={<>Featured <em>nominees.</em></>} copy="Representative nominee data is shown for the frontend preview."/>
          <div className="nominee-grid">{nominees.map(n => <NomineeCard key={n.code} nominee={n}/>)}</div>
          <div className="section-cta"><Link className="button secondary" href="/nominees">View all nominees <ChevronRight size={16}/></Link></div>
        </section>

        <section className="section">
          <SectionHeading label="Upcoming" title={<>Events & <em>engagement.</em></>} copy="Browse the latest event experiences available through the platform." />
          <div className="event-grid">{events.slice(0, 3).map(e => <EventCard event={e} key={e.slug}/>)}</div>
        </section>

        <section className="section professional-cta">
          <div>
            <Pill tone="gold">Get involved</Pill>
            <h2>Connect with the foundation.</h2>
            <p>Explore programmes, support an event, participate in voting or start a conversation.</p>
          </div>
          <div className="hero-actions">
            <Link className="button light" href="/contact">Contact us <ArrowRight size={16}/></Link>
            <Link className="text-button light-text" href="/partners">Partners & sponsors</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

export function AwardsPlaceholder() {
  return <><PublicHeader/><main className="section"><SectionHeading label="Awards" title={<>Recognition with <em>purpose.</em></>} copy="A representative frontend view for the 2026 awards edition."/><div className="nominee-grid">{nominees.map(n=><NomineeCard nominee={n} key={n.code}/>)}</div></main><PublicFooter/></>
}
