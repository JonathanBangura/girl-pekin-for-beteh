import { EventSalesLivePage } from '@/components/portal/event-sales-live'

type PageProps = {
  searchParams: Promise<{
    event_id?: string
    from?: string
    to?: string
    status?: string
    method?: string
    page?: string
  }>
}

export default async function EventSalesPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams

  return <EventSalesLivePage filters={filters} />
}
