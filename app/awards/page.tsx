import Link from 'next/link'
import { PublicHeader, PublicFooter, SectionHeading, NomineeCard, Pill } from '@/components/public/public'
import { nominees, eventDetails } from '@/lib/mock-data'

export default function AwardsPage() {
  return <><PublicHeader/><main><section className="page-hero"><Pill tone="gold">{eventDetails.edition} · 2026</Pill><h1>{eventDetails.title}</h1><p>A dedicated awards experience for edition information, nominees, public voting, ceremony details and results.</p><div className="hero-actions"><Link className="button" href="/vote">Public voting</Link><Link className="button secondary" href="/events/50misa-2026/tickets">Ceremony tickets</Link></div></section><section className="section section-surface"><SectionHeading label="Nominee directory" title={<>2026 <em>nominees.</em></>} copy="Representative nominee information is shown in this frontend preview."/><div className="nominee-grid">{nominees.map(n=><NomineeCard nominee={n} key={n.name}/>)}</div></section></main><PublicFooter/></>
}
