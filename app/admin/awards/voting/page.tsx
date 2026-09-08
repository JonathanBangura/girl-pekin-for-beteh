import { VotingManagementLivePage } from '@/components/portal/voting-management-live'

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  return <VotingManagementLivePage saved={params.saved} error={params.error} />
}
