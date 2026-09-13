import { ResultsCertificationPage } from '@/components/portal/results-certification'

type PageProps = {
  searchParams: Promise<{
    edition?: string
    done?: string
    error?: string
  }>
}

export default async function ResultsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <ResultsCertificationPage
      editionId={params.edition}
      done={params.done}
      error={params.error}
    />
  )
}
