import { IndividualTicketsManagementLivePage } from '@/components/portal/individual-tickets-live'

type PageProps = {
  searchParams: Promise<{
    event_id?: string
    status?: string
  }>
}

export default async function TicketsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <IndividualTicketsManagementLivePage
      eventId={params.event_id}
      status={params.status}
    />
  )
}
