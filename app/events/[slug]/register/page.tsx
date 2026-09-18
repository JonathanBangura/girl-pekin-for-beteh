import { PublicFreeRegistrationPage } from '@/components/ticketing/event-access-public'

export default async function Page({
  params,
}: {
  params: Promise<{
    slug: string
  }>
}) {
  const { slug } = await params

  return (
    <PublicFreeRegistrationPage
      slug={slug}
    />
  )
}
