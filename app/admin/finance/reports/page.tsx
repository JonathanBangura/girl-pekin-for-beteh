import { FinanceReportsLivePage } from '@/components/portal/finance-refunds-reports'

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

  return <FinanceReportsLivePage filters={filters} />
}
