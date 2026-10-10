import { DonationsListAdminPage } from '@/components/portal/donations-admin'

type PageProps = {
  searchParams: Promise<{
    status?: string
    campaign?: string
    q?: string
    page?: string
  }>
}

export default async function Page({
  searchParams,
}: PageProps) {
  const filters = await searchParams

  return <DonationsListAdminPage filters={filters} />
}
