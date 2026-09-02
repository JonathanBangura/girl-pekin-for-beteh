import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Clock3, MapPin, Ticket } from 'lucide-react'
import { PublicHeader, PublicFooter, Pill } from '@/components/public/public'
import { eventDetails, ticketTiers } from '@/lib/mock-data'

export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  await params
  return <><PublicHeader/><main>
    <section className="v2-event-detail-hero"><div><span className="v2-overline light">Ceremony · {eventDetails.edition}</span><h1>{eventDetails.title}</h1><p>Official ceremony information and event ticketing experience.</p><div className="hero-actions"><Link className="button light" href="/events/50misa-2026/tickets"><Ticket size={15}/> Choose tickets</Link><Link className="v2-light-outline" href="/awards/50misa-2026">Award details</Link></div></div><div className="v2-event-poster"><Image src={eventDetails.artwork} alt="50 Most Influential Students' Award ceremony artwork" fill sizes="(max-width: 900px) 100vw, 400px" className="v2-award-artwork-image"/></div></section>
    <section className="section v2-event-info-grid"><div><CalendarDays size={18}/><span><small>Date</small><strong>{eventDetails.date}</strong></span></div><div><Clock3 size={18}/><span><small>Time</small><strong>{eventDetails.time}</strong></span></div><div><MapPin size={18}/><span><small>Venue</small><strong>{eventDetails.location}</strong></span></div></section>
    <section className="section section-surface v2-section-surface"><div className="v2-event-ticket-preview"><div><Pill tone="gold">Ceremony Tickets</Pill><h2>Choose the access tier that suits your attendance.</h2><p>Diploma, Degree, Masters and PhD are event ticket tier names only.</p></div><div className="v2-ticket-mini-table">{ticketTiers.map(t => <div key={t.name}><strong>{t.name}</strong><span>{t.displayPrice}</span></div>)}</div><Link className="button" href="/events/50misa-2026/tickets">Select tickets</Link></div></section>
  </main><PublicFooter/></>
}
