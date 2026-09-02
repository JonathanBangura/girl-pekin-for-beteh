import Link from 'next/link'
import { CalendarDays, MapPin } from 'lucide-react'
import { PublicHeader, PublicFooter, Pill } from '@/components/public/public'
import { eventDetails } from '@/lib/mock-data'
export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  await params
  return <><PublicHeader/><main><section className="page-hero"><Pill tone="gold">{eventDetails.edition} · Ceremony</Pill><h1>{eventDetails.title}</h1><p>Official ceremony information and event ticketing interface.</p><div className="hero-actions"><Link className="button" href="/events/50misa-2026/tickets">Choose tickets</Link><Link className="button secondary" href="/awards/50misa-2026">Award details</Link></div></section><section className="section"><div className="panel event-detail-panel"><div><CalendarDays size={20}/><span><small>Date & time</small><strong>{eventDetails.date} · {eventDetails.time}</strong></span></div><div><MapPin size={20}/><span><small>Venue</small><strong>{eventDetails.location}</strong></span></div></div></section></main><PublicFooter/></>
}
