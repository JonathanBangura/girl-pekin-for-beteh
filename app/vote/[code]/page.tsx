import { VoteScreen } from '@/components/foundation'
export default async function NomineeVotePage({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <VoteScreen code={code} /> }
