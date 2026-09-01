import { TicketsScreen } from '@/components/ticketing/ticketing'
export default async function EventTickets({ params }: { params: Promise<{ slug: string }> }) { await params; return <TicketsScreen /> }
