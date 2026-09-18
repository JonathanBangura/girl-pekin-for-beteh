import { PublicInvitationClaimPage } from '@/components/ticketing/event-access-public'

export default async function Page({
  params,
}: {
  params: Promise<{
    slug: string
    token: string
  }>
}) {
  const { slug, token } =
    await params

  return (
    <PublicInvitationClaimPage
      slug={slug}
      token={token}
    />
  )
}
