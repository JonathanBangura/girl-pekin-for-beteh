import { TicketsScreen } from '@/components/foundation'
export default async function EventTickets({ params }: { params: Promise<{ slug: string }> }) { await params; return <TicketsScreen /> }
