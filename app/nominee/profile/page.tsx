import { NomineeProfileLivePage } from '@/components/portal/nominee-live-pages'

type PageProps = {
  searchParams: Promise<{
    updated?: string
    error?: string
  }>
}

export default async function NomineeProfilePage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <NomineeProfileLivePage
      updated={params.updated}
      error={params.error}
    />
  )
}
