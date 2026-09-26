import { PublicNominationApplicationPage } from '@/components/public/nomination-application'

type PageProps = {
  searchParams: Promise<{
    submitted?: string
    reference?: string
    error?: string
  }>
}

export default async function ApplyPage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <PublicNominationApplicationPage
      submitted={params.submitted}
      reference={params.reference}
      error={params.error}
    />
  )
}
