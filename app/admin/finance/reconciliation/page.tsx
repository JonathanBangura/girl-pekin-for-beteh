import { FinanceReconciliationLivePage } from '@/components/portal/finance-live'

type PageProps = {
  searchParams: Promise<{
    reprocessed?: string
    repaired?: string
    error?: string
  }>
}

export default async function ReconciliationPage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <FinanceReconciliationLivePage
      reprocessed={params.reprocessed}
      repaired={params.repaired}
      error={params.error}
    />
  )
}
