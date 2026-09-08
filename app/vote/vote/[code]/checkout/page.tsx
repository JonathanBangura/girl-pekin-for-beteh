import { LiveVoteCheckout } from '@/components/voting/live-voting'

export default async function VoteCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ votes?: string }>
}) {
  const { code } = await params
  const query = await searchParams
  const quantity = Number(query.votes ?? 1)

  return (
    <LiveVoteCheckout
      code={code}
      quantity={Number.isFinite(quantity) ? quantity : 1}
    />
  )
}
