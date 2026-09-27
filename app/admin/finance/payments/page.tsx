import { FinancePaymentsV1Page } from '@/components/portal/finance-payments-v1'

type PageProps = {
  searchParams: Promise<{
    status?: string
    type?: string
    provider?: string
    method?: string
    q?: string
    page?: string
  }>
}

export default async function PaymentsPage({
  searchParams,
}: PageProps) {
  const filters = await searchParams
  return <FinancePaymentsV1Page filters={filters} />
}
