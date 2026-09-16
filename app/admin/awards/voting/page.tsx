import { VotingManagementLivePage } from '@/components/portal/voting-management-live'

type PageProps = {
  searchParams: Promise<{
    edition?: string
    saved?: string
    error?: string
  }>
}

export default async function Page({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <VotingManagementLivePage
      requestedEditionId={params.edition}
      saved={params.saved}
      error={params.error}
    />
  )
}
