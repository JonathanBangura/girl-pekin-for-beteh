import { PublicHeader, PublicFooter, EventCard, SectionHeading } from '@/components/foundation'
import { events } from '@/lib/mock-data'
export default function EventsPage() { return <><PublicHeader/><main className="section"><SectionHeading label="Events" title={<>Gather, learn,<br/><em>make change.</em></>} copy="Frontend demo event listings for the foundation experience."/><div className="event-grid">{events.map(event => <EventCard event={event} key={event.slug}/>)}</div></main><PublicFooter/></> }
