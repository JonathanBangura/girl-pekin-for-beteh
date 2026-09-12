import { AwardsManagementPage } from '@/components/portal/award-edition-management'

type PageProps = {
  searchParams: Promise<{
    created?: string
    updated?: string
    error?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <AwardsManagementPage
      created={params.created}
      updated={params.updated}
      error={params.error}
    />
  )
}
