import { PublicDonationsPage } from '@/components/donations/public-donations'
import { getPublicDonationCampaigns } from '@/lib/donations/public-data'

export default async function DonatePage() {
  const campaigns = await getPublicDonationCampaigns()

  return (
    <PublicDonationsPage campaigns={campaigns} />
  )
}
