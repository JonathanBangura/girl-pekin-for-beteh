import { EventSalesV1Page } from '@/components/portal/event-sales-v1'

type PageProps = {
  searchParams: Promise<{
    event_id?: string
    from?: string
    to?: string
    method?: string
    page?: string
  }>
}

export default async function EventSalesPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams

  return <EventSalesV1Page filters={filters} />
}
