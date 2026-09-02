import { PublicHeader, PublicFooter, EventCard, SectionHeading } from '@/components/public/public'
import { events } from '@/lib/mock-data'
export default function EventsPage() { return <><PublicHeader/><main><section className="page-hero"><SectionHeading label="Events" title={<>Events & <em>engagement.</em></>} copy="Browse representative events, ceremony information and ticket availability."/></section><section className="section"><div className="event-grid">{events.map(event => <EventCard event={event} key={event.slug}/>)}</div></section></main><PublicFooter/></> }
