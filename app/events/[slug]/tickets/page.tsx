import { PublicTicketsLivePage } from '@/components/ticketing/live-ticketing'

export default async function EventTickets({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <PublicTicketsLivePage slug={slug} />
}
