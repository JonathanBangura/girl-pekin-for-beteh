import { VoteScreen } from '@/components/voting/voting'
export default async function NomineeVotePage({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <VoteScreen code={code} /> }
