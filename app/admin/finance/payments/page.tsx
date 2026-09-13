import { FinancePaymentsLivePage } from '@/components/portal/finance-live'

type PageProps = {
  searchParams: Promise<{
    status?: string
    type?: string
    provider?: string
    q?: string
  }>
}

export default async function PaymentsPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams
  return <FinancePaymentsLivePage filters={filters} />
}
