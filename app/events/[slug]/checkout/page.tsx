import { PublicTicketCheckoutLivePage } from '@/components/ticketing/live-ticketing'

export default async function EventCheckout({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    ticket_type?: string
    quantity?: string
    donation?: string
  }>
}) {
  const { slug } = await params
  const query = await searchParams

  const quantity = Number(query.quantity ?? 1)
  const donation =
    query.donation == null ? null : Number(query.donation)

  return (
    <PublicTicketCheckoutLivePage
      slug={slug}
      ticketTypeId={query.ticket_type ?? ''}
      quantity={Number.isFinite(quantity) ? quantity : 1}
      donation={
        donation != null && Number.isFinite(donation)
          ? donation
          : null
      }
    />
  )
}
