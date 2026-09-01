import Link from 'next/link'
import { PublicHeader, PublicFooter, Pill, Button } from '@/components/foundation'
import { eventDetails } from '@/lib/mock-data'
export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) { await params; return <><PublicHeader/><main className="section"><Pill tone="gold">{eventDetails.edition}</Pill><h1>{eventDetails.title}</h1><p>{eventDetails.date} · {eventDetails.time} · {eventDetails.location}</p><Link className="button" href="/events/50misa-2026/tickets">Choose tickets</Link></main><PublicFooter/></> }
