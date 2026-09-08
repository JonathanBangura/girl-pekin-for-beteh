import { PublicNomineeDirectoryLivePage } from '@/components/public/live-awards'

type PageProps = {
  searchParams: Promise<{
    q?: string
    category?: string
  }>
}

export default async function NomineesPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <PublicNomineeDirectoryLivePage
      query={params.q}
      category={params.category}
    />
  )
}
