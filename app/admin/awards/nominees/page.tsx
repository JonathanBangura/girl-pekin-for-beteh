import { NomineesLivePage } from '@/components/portal/awards-live'

type PageProps = {
  searchParams: Promise<{ created?: string; error?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  return <NomineesLivePage created={params.created} error={params.error} />
}
