import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { PublicHeader, PublicFooter, NomineeCard, Pill, SectionHeading } from '@/components/public/public'
import { nominees, eventDetails } from '@/lib/mock-data'

export default function AwardsPage() {
  return <><PublicHeader/><main>
    <section className="v2-awards-index-hero">
      <div><span className="v2-overline light">Awards & Recognition</span><Pill tone="gold">Current Edition · 2026</Pill><h1>{eventDetails.title}</h1><p>A professional award experience connecting edition information, nominees, voting and the ceremony.</p><div className="hero-actions"><Link className="button light" href="/awards/50misa-2026">View edition <ArrowUpRight size={15}/></Link><Link className="v2-light-outline" href="/vote">Public voting</Link></div><div className="v2-awards-mini-facts"><span><CalendarDays size={15}/>{eventDetails.date}</span><span><MapPin size={15}/>{eventDetails.location}</span></div></div>
      <div className="v2-awards-poster"><Image src={eventDetails.artwork} alt="50 Most Influential Students' Award – Sierra Leone 2026 campaign artwork" fill sizes="(max-width: 900px) 100vw, 420px" className="v2-award-artwork-image" priority/></div>
    </section>
    <section className="section section-surface v2-section-surface"><SectionHeading label="Nominee Directory" title={<>Featured nominees</>} copy="Representative nominee data is shown in this frontend preview."/><div className="nominee-grid v2-nominee-grid">{nominees.map(n=><NomineeCard nominee={n} key={n.code}/>)}</div><div className="section-cta"><Link className="button secondary" href="/nominees">View nominee directory</Link></div></section>
  </main><PublicFooter/></>
}
