import { PublicEventDetailLivePage } from '@/components/ticketing/live-ticketing'

export default async function EventDetail({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <PublicEventDetailLivePage slug={slug} />
}
