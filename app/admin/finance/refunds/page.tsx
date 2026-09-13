import { FinanceRefundsLivePage } from '@/components/portal/finance-refunds-reports'

type PageProps = {
  searchParams: Promise<{
    recorded?: string
    error?: string
  }>
}

export default async function RefundsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <FinanceRefundsLivePage
      recorded={params.recorded}
      error={params.error}
    />
  )
}
