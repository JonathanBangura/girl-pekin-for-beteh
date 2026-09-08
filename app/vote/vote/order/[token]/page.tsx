import { LiveVoteOrderStatus } from '@/components/voting/live-voting'

export default async function VoteOrderPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <LiveVoteOrderStatus token={token} />
}
