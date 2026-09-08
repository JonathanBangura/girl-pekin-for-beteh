import { PublicNomineeProfileLivePage } from '@/components/public/live-awards'

export default async function NomineeProfilePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <PublicNomineeProfileLivePage code={code} />
}
