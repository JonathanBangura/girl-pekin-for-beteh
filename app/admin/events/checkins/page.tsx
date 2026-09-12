import { CheckinsLivePage } from '@/components/portal/checkins-live'

export default async function CheckinsPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>
}) {
  const params = await searchParams
  return <CheckinsLivePage eventId={params.event_id} />
}
