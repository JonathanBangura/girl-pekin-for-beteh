import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicDonationsPage } from '@/components/donations/public-donations'
import { getPublicDonationCampaigns } from '@/lib/donations/public-data'
import {
  compactDescription,
  publicMetadata,
} from '@/lib/seo/site'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const campaigns = await getPublicDonationCampaigns(slug)
  const campaign = campaigns[0]

  if (!campaign) {
    return publicMetadata({
      title: 'Donate',
      description:
        'Support Girl Pikin For Betteh Foundation.',
      path: `/donate/${encodeURIComponent(slug)}`,
    })
  }

  return publicMetadata({
    title: campaign.title,
    description: compactDescription(
      campaign.summary || campaign.description,
      `Support ${campaign.title} through Girl Pikin For Betteh Foundation.`,
    ),
    path: `/donate/${encodeURIComponent(campaign.slug)}`,
    image: campaign.cover_image_url,
  })
}

export default async function DonationCampaignPage({
  params,
}: PageProps) {
  const { slug } = await params
  const campaigns = await getPublicDonationCampaigns(slug)
  const campaign = campaigns[0]

  if (!campaign) notFound()

  return (
    <PublicDonationsPage
      campaigns={campaigns}
      selectedCampaign={campaign}
    />
  )
}
