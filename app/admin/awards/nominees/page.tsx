import { NomineesManagementPage } from '@/components/portal/awards-management-live'

type PageProps = {
  searchParams: Promise<{
    created?: string
    updated?: string
    linked?: string
    error?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <NomineesManagementPage
      created={params.created}
      updated={params.updated}
      linked={params.linked}
      error={params.error}
    />
  )
}
