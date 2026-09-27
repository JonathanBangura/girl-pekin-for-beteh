import { FinanceReportsV1Page } from '@/components/portal/finance-reports-v1'

type PageProps = {
  searchParams: Promise<{
    from?: string
    to?: string
  }>
}

export default async function ReportsPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams

  return <FinanceReportsV1Page filters={filters} />
}
