import { TicketTypesManagementLivePage } from '@/components/portal/ticketing-management-live'

type PageProps = {
  searchParams: Promise<{
    saved?: string
    error?: string
  }>
}

export default async function TicketTypesPage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <TicketTypesManagementLivePage
      saved={params.saved}
      error={params.error}
    />
  )
}
