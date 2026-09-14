import { ContactLivePage } from '@/components/public/cms-pages'

type PageProps = {
  searchParams: Promise<{
    sent?: string
    error?: string
  }>
}

export default async function Page({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return (
    <ContactLivePage
      sent={params.sent}
      error={params.error}
    />
  )
}
