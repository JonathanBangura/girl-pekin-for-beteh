import { notFound } from 'next/navigation'
import { VultPaymentStatusPage } from '@/components/payments/vult-payment-status'
import type { PublicVultOrderKind } from '@/lib/vult/public'

export default async function Page({
  params,
}: {
  params: Promise<{ kind: string; token: string }>
}) {
  const { kind, token } = await params

  if (kind !== 'vote' && kind !== 'ticket') {
    notFound()
  }

  return (
    <VultPaymentStatusPage
      kind={kind as PublicVultOrderKind}
      token={token}
    />
  )
}
