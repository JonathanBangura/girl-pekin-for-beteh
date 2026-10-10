import { notFound } from 'next/navigation'
import { DonationReceiptPage } from '@/components/donations/donation-receipt'
import { getPublicDonationReceipt } from '@/lib/donations/public-data'

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const receipt = await getPublicDonationReceipt(token)

  if (!receipt) notFound()

  return <DonationReceiptPage receipt={receipt} />
}
