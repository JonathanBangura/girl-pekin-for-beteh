import { VoteCheckout } from '@/components/voting/voting'

export default async function VoteCheckoutPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ votes?: string }> }) {
  const { code } = await params
  const query = await searchParams
  return <VoteCheckout code={code} votes={Math.max(1, Number(query.votes ?? 1))} />
}
