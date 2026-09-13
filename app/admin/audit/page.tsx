import { AuditLogsLivePage } from '@/components/portal/users-roles-audit'

type PageProps = {
  searchParams: Promise<{
    actor?: string
    action?: string
    entity?: string
    from?: string
    to?: string
  }>
}

export default async function AuditPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams

  return <AuditLogsLivePage filters={filters} />
}
