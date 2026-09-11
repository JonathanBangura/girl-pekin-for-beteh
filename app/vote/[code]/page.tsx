import { LiveVoteScreen } from '@/components/voting/live-voting'

export default async function NomineeVotePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <LiveVoteScreen code={code} />
}
