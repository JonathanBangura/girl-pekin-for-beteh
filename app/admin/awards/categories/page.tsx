import { CategoriesManagementPage } from '@/components/portal/awards-management-live'

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
    <CategoriesManagementPage
      created={params.created}
      updated={params.updated}
      error={params.error}
    />
  )
}
