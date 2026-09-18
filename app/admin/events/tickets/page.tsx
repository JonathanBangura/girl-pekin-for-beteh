import { IndividualTicketsManagementLivePage } from '@/components/portal/individual-tickets-live'

type PageProps = {
  searchParams: Promise<{
    event_id?: string
    status?: string
    q?: string
    cancelled?: string
    reissued?: string
    error?: string
  }>
}

export default async function TicketsPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams

  return (
    <IndividualTicketsManagementLivePage
      eventId={params.event_id}
      status={params.status}
      query={params.q}
      cancelled={
        params.cancelled
      }
      reissued={
        params.reissued
      }
      error={params.error}
    />
  )
}
