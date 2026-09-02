'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Check, Mail, MapPin, Phone, CalendarDays, Clock3, Ticket, Award, ShieldCheck } from 'lucide-react'
import { PublicHeader, PublicFooter, SectionHeading, Pill, Button, NomineeCard } from '@/components/public/public'
import { news, nominees, eventDetails, ticketTiers } from '@/lib/mock-data'

function Shell({ children }: { children: React.ReactNode }) {
  return <><PublicHeader/><main>{children}</main><PublicFooter/></>
}

export function AboutPage() {
  return (
    <Shell>
      <section className="page-hero v2-page-hero">
        <span className="v2-overline">About the Foundation</span>
        <h1>Clear information about the organization, its purpose and its work.</h1>
        <p>This page is prepared for approved organizational information. Mission, vision, history and leadership content remain placeholders until confirmed.</p>
      </section>
      <section className="section v2-about-grid">
        <div>
          <Pill>Purpose & Direction</Pill>
          <h2 className="v2-editorial-heading">A professional structure for approved organizational information.</h2>
          <div className="v2-copy-stack"><p><strong>Mission placeholder.</strong> Approved mission content will be added here when supplied by the foundation.</p><p><strong>Vision placeholder.</strong> Approved long-term vision content will be added here when supplied by the foundation.</p></div>
        </div>
        <div className="panel v2-principles-card">
          <span className="v2-overline">Operating principles</span>
          {['Listen and understand','Act with integrity','Create practical opportunity','Communicate with clarity'].map((v, i) => <div key={v}><span>{String(i+1).padStart(2,'0')}</span><Check size={16}/><strong>{v}</strong></div>)}
        </div>
      </section>
      <section className="section section-surface v2-section-surface">
        <SectionHeading label="Leadership" title={<>People behind the work</>} copy="Approved leadership and team profiles can be published here when available."/>
        <div className="v2-leadership-grid">
          {['Leadership Team','Programme Team','Advisory & Support'].map((name, i) => <article key={name}><span>{String(i+1).padStart(2,'0')}</span><h3>{name}</h3><p>Profile and role information placeholder.</p></article>)}
        </div>
      </section>
      <section className="v2-closing-cta"><div><span className="v2-overline light">Connect</span><h2>Start a conversation with the foundation.</h2><p>Use the contact page for partnerships, programme enquiries and general information.</p></div><Link className="button light" href="/contact">Contact us <ArrowUpRight size={15}/></Link></section>
    </Shell>
  )
}

export function ProgramsPage() {
  const programs = [
    ['01','Demo Programme One','Active demo','Approved programme image and summary will appear here.'],
    ['02','Demo Programme Two','Active demo','Approved programme image and summary will appear here.'],
    ['03','Demo Programme Three','Planned demo','Approved programme image and summary will appear here.'],
  ]
  return (
    <Shell>
      <section className="page-hero v2-page-hero"><span className="v2-overline">Programs & Initiatives</span><h1>Programmes presented with clarity, status and context.</h1><p>Representative content is used until approved programme titles, objectives, dates, locations and outcomes are supplied.</p></section>
      <section className="section"><div className="v2-program-list">{programs.map(([n,title,status,copy]) => <article key={title}><span className="v2-program-number">{n}</span><div><Pill>{status}</Pill><h2>{title}</h2><p>{copy}</p></div><Link className="text-button" href="/contact">Programme enquiry <ArrowUpRight size={14}/></Link></article>)}</div></section>
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
      <section className="page-hero v2-page-hero"><span className="v2-overline">{kind}</span><h1>{config[0]}</h1><p>{config[1]}</p></section>
      {kind === 'news' && <section className="section"><div className="v2-news-list">{news.map((n, i) => <article key={n.title}><span>{String(i+1).padStart(2,'0')}</span><div><Pill>{n.tag}</Pill><h2>{n.title}</h2><p>{n.date}</p></div><Link className="text-button" href="/news">Read update <ArrowUpRight size={14}/></Link></article>)}</div></section>}
      {kind === 'gallery' && <section className="section"><div className="v2-gallery-grid">{['Programme activity','Workshop session','Awards ceremony','Community engagement','Training session','Event highlights'].map((x, i) => <div className={`gallery-tile ${['teal','coral','gold'][i%3]}`} key={x}><span>{x}</span><small>Approved image placeholder</small></div>)}</div></section>}
      {kind === 'partners' && <section className="section"><div className="v2-partner-grid">{['Title Partner','Supporting Partner','Media Partner'].map((x, i) => <article key={x}><span>{String(i+1).padStart(2,'0')}</span><div className="v2-logo-placeholder">Logo</div><h3>{x}</h3><p>Approved partner identity and information placeholder.</p></article>)}</div></section>}
      {kind === 'contact' && <section className="section v2-contact-layout"><form className="panel v2-contact-form" onSubmit={e => e.preventDefault()}><div><span className="v2-overline">Enquiry form</span><h2>Send a message</h2></div>{['Name','Email','Phone','Subject'].map(x => <label key={x}>{x}<input placeholder={`Enter ${x.toLowerCase()}`}/></label>)}<label>Message<textarea rows={5} placeholder="Enter your message"/></label><Button>Submit enquiry</Button></form><aside className="v2-contact-aside"><span className="v2-overline light">Contact information</span><h2>Official details will be published after confirmation.</h2><p><Mail size={16}/> Email placeholder</p><p><Phone size={16}/> Phone placeholder</p><p><MapPin size={16}/> Freetown, Sierra Leone</p></aside></section>}
    </Shell>
  )
}

export function AwardEditionPage() {
  return (
    <Shell>
      <section className="v2-award-hero">
        <div className="v2-award-hero-copy">
          <span className="v2-overline light">Current Award · 2026</span>
          <Pill tone="gold">{eventDetails.edition}</Pill>
          <h1>{eventDetails.title}</h1>
          <p>A dedicated edition experience for nominee discovery, public voting, ceremony information and ticketing.</p>
          <div className="hero-actions"><Link className="button light" href="/vote">Vote now <ArrowUpRight size={15}/></Link><Link className="v2-light-outline" href="/events/50misa-2026/tickets">Ceremony tickets <Ticket size={15}/></Link></div>
          <div className="v2-award-facts"><span><CalendarDays size={16}/><small>Date</small><b>{eventDetails.date}</b></span><span><Clock3 size={16}/><small>Time</small><b>{eventDetails.time}</b></span><span><MapPin size={16}/><small>Venue</small><b>{eventDetails.location}</b></span></div>
        </div>
        <div className="v2-award-artwork"><Image src={eventDetails.artwork} alt="Official campaign artwork for the 50 Most Influential Students' Award – Sierra Leone 2026" fill sizes="(max-width: 900px) 100vw, 480px" className="v2-award-artwork-image" priority/><span>Official campaign artwork</span></div>
      </section>

      <section className="section v2-award-overview">
        <div><Pill>Award Experience</Pill><h2 className="v2-editorial-heading">One edition. Connected participation.</h2><p>The award edition brings nominees, public voting and ceremony access into one consistent digital experience.</p></div>
        <div className="v2-award-feature-list"><article><Award size={18}/><div><strong>Nominee directory</strong><p>Browse approved nominees by code and category.</p></div></article><article><ShieldCheck size={18}/><div><strong>Public voting</strong><p>Structured vote selection and checkout workflow.</p></div></article><article><Ticket size={18}/><div><strong>Ceremony ticketing</strong><p>Configurable fixed-price and donation ticket tiers.</p></div></article></div>
      </section>

      <section className="section section-surface v2-section-surface">
        <SectionHeading label="Nominee Directory" title={<>Representative nominees</>} copy="Demo records are used in this frontend preview until approved nominee data is connected."/>
        <div className="nominee-grid v2-nominee-grid">{nominees.map(n => <NomineeCard nominee={n} key={n.code}/>)}</div>
        <div className="section-cta"><Link className="button secondary" href="/nominees">Browse all nominees</Link></div>
      </section>

      <section className="section v2-ticket-tier-section">
        <SectionHeading label="Ceremony Tickets" title={<>2026 ticket tiers</>} copy="These are event ticket tier names only and are not nominee academic classifications."/>
        <div className="v2-ticket-tier-table">{ticketTiers.map((tier, i) => <div key={tier.name}><span>{String(i+1).padStart(2,'0')}</span><strong>{tier.name}</strong><b>{tier.displayPrice}</b><small>{tier.state}</small></div>)}</div>
        <div className="section-cta"><Link className="button" href="/events/50misa-2026/tickets">Choose ceremony tickets</Link></div>
      </section>
    </Shell>
  )
}
