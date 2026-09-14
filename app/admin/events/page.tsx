import { EventsManagementLivePage } from '@/components/portal/event-management-live'

type PageProps = {
  searchParams: Promise<{
    saved?: string
    error?: string
  }>
}

export default async function Page({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <EventsManagementLivePage
      saved={params.saved}
      error={params.error}
    />
  )
}
