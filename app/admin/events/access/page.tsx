import { EventAccessManagementPage } from '@/components/portal/event-access-management'

type PageProps = {
  searchParams: Promise<{
    event_id?: string
    invited?: string
    complimentary?: string
    revoked?: string
    error?: string
  }>
}

export default async function Page({
  searchParams,
}: PageProps) {
  const params =
    await searchParams

  return (
    <EventAccessManagementPage
      eventId={params.event_id}
      invited={params.invited}
      complimentary={
        params.complimentary
      }
      revoked={params.revoked}
      error={params.error}
    />
  )
}
