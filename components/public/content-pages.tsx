'use client'

import Link from 'next/link'
import { ArrowUpRight, Check, Mail, MapPin, Phone } from 'lucide-react'
import { PublicHeader, PublicFooter, SectionHeading, Pill, Button, NomineeCard, EventCard } from '@/components/public/public'
import { events, news, nominees, eventDetails } from '@/lib/mock-data'

function Shell({ children }: { children: React.ReactNode }) {
  return <><PublicHeader/><main>{children}</main><PublicFooter/></>
}

export function AboutPage() {
  return (
    <Shell>
      <section className="page-hero">
        <Pill tone="teal">About the Foundation</Pill>
        <h1>A foundation focused on <em>opportunity and participation.</em></h1>
        <p>This page is structured for approved information about the organization’s history, purpose, leadership and approach. Placeholder content remains clearly identified until confirmed.</p>
      </section>
      <section className="section two-col">
        <div>
          <SectionHeading label="Purpose" title={<>Clear purpose.<br/><em>Responsible action.</em></>}/>
          <p><strong>Mission placeholder:</strong> approved mission content will be added here once supplied by the foundation.</p>
          <p><strong>Vision placeholder:</strong> approved long-term vision content will be added here once supplied by the foundation.</p>
        </div>
        <div className="panel values">
          <h3>Operating principles</h3>
          {['Listen and understand','Act with integrity','Create practical opportunity','Measure progress responsibly'].map(v => <div key={v}><Check size={17}/><span>{v}</span></div>)}
        </div>
      </section>
      <section className="section section-surface">
        <SectionHeading label="Leadership" title={<>People behind <em>the work.</em></>} copy="Leadership and team profiles will be displayed here when approved information is available."/>
        <div className="impact-grid professional-focus-grid">
          {['Leadership Team','Program Team','Advisory & Support'].map((name, i) => <article className="impact-card focus-card" key={name}><span className="focus-number">0{i+1}</span><h3>{name}</h3><p>Profile and role information placeholder.</p></article>)}
        </div>
      </section>
      <section className="section professional-cta">
        <div><Pill tone="gold">Connect</Pill><h2>Start a conversation with the foundation.</h2><p>Use the contact page for partnerships, programme enquiries and general information.</p></div>
        <Link className="button light" href="/contact">Contact us <ArrowUpRight size={16}/></Link>
      </section>
    </Shell>
  )
}

export function ProgramsPage() {
  return (
    <Shell>
      <section className="page-hero">
        <Pill tone="teal">Programs & Initiatives</Pill>
        <h1>Structured programmes with <em>clear objectives.</em></h1>
        <p>Representative programme cards are shown below. Approved programme titles, descriptions, dates and outcomes can replace this demo content later.</p>
      </section>
      <section className="section">
        <div className="program-grid">
          {['Program One','Program Two','Program Three'].map((name, i) => (
            <article className="panel program-card" key={name}>
              <div className={`program-image ${['teal','coral','gold'][i]}`}>Approved image placeholder</div>
              <Pill>{i === 2 ? 'Planned · Demo' : 'Demo program'}</Pill>
              <h3>{name}</h3>
              <p>Structured placeholder text for an approved programme summary, audience, objective and status.</p>
              <Link className="text-button" href="/contact">Program enquiry <ArrowUpRight size={15}/></Link>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  )
}

export function SimplePublicPage({ kind }: { kind: 'news'|'gallery'|'partners'|'contact' }) {
  const config = {
    news: ['News & Updates','Approved announcements, programme updates and organizational news.'],
    gallery: ['Media Gallery','Approved images from programmes, events and foundation activities.'],
    partners: ['Partners & Sponsors','A structured area for approved partner and sponsor information.'],
    contact: ['Contact the Foundation','Send an enquiry, partnership request or general message.'],
  }[kind]

  return (
    <Shell>
      <section className="page-hero"><Pill tone="teal">{kind}</Pill><h1>{config[0]}</h1><p>{config[1]}</p></section>
      {kind === 'news' && <section className="section"><div className="story-grid">{news.map(n => <article className="panel" key={n.title}><Pill>{n.tag}</Pill><h3>{n.title}</h3><p>{n.date}</p><Link className="text-button" href="/news">Read update <ArrowUpRight size={15}/></Link></article>)}</div></section>}
      {kind === 'gallery' && <section className="section gallery-grid">{['Programme activity','Workshop session','Awards ceremony','Community engagement','Training session','Event highlights'].map((x, i) => <div className={`gallery-tile ${['teal','coral','gold'][i%3]}`} key={x}><span>{x}</span><small>Approved image placeholder</small></div>)}</section>}
      {kind === 'partners' && <section className="section"><div className="impact-grid professional-focus-grid">{['Title Partner','Supporting Partner','Media Partner'].map((x, i) => <article className="impact-card focus-card" key={x}><span className="focus-number">0{i+1}</span><h3>{x}</h3><p>Approved logo and organization details placeholder.</p></article>)}</div></section>}
      {kind === 'contact' && <section className="section contact-layout"><form className="panel contact-form" onSubmit={e => e.preventDefault()}>{['Name','Email','Phone','Subject'].map(x => <label key={x}>{x}<input placeholder={`Enter ${x.toLowerCase()}`}/></label>)}<label>Message<textarea rows={5} placeholder="Enter your message"/></label><Button>Submit enquiry</Button></form><div className="panel contact-info"><h3>Contact information</h3><p>Official contact details will be added after confirmation.</p><p><Mail size={16}/> Email placeholder</p><p><Phone size={16}/> Phone placeholder</p><p><MapPin size={16}/> Freetown, Sierra Leone</p></div></section>}
    </Shell>
  )
}

export function AwardEditionPage() {
  return (
    <Shell>
      <section className="page-hero">
        <Pill tone="gold">{eventDetails.edition} · 2026</Pill>
        <h1>{eventDetails.title}</h1>
        <p>A dedicated edition page for nominees, public voting, ceremony information, ticketing and results.</p>
        <div className="hero-actions"><Link className="button" href="/vote">Vote now <ArrowUpRight size={16}/></Link><Link className="button secondary" href="/events/50misa-2026/tickets">Buy tickets</Link></div>
      </section>
      <section className="section two-col">
        <div><SectionHeading label="Ceremony" title={<>2026 ceremony <em>information.</em></>}/><p>{eventDetails.date} · {eventDetails.time}</p><p>{eventDetails.location}</p></div>
        <div className="panel"><Pill tone="teal">Voting interface · Demo</Pill><h3>Nominee directory</h3><p>Browse representative nominee profiles and open the public voting experience.</p><Link className="text-button" href="/nominees">Browse nominees <ArrowUpRight size={15}/></Link></div>
      </section>
    </Shell>
  )
}

export function NomineesPage() {
  return <Shell><section className="page-hero"><Pill tone="teal">Nominee Directory</Pill><h1>2026 award <em>nominees.</em></h1><p>Representative nominee data is used in this frontend preview.</p></section><section className="section nominee-grid">{nominees.map(n => <NomineeCard key={n.code} nominee={n}/>)}</section></Shell>
}

export function EventsPage() {
  return <Shell><section className="page-hero"><Pill tone="teal">Events</Pill><h1>Events, ceremonies and <em>public programmes.</em></h1><p>Browse event information, availability and ticketing options.</p></section><section className="section event-grid">{events.map(e => <EventCard key={e.slug} event={e}/>)}</section></Shell>
}
