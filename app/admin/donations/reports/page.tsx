import { DonationReportsAdminPage } from '@/components/portal/donations-admin'

type PageProps = {
  searchParams: Promise<{
    from?: string
    to?: string
  }>
}

export default async function Page({
  searchParams,
}: PageProps) {
  const filters = await searchParams

  return <DonationReportsAdminPage filters={filters} />
}
