import { PublicResultsPage } from '@/components/public/live-results'

export default async function AwardResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return <PublicResultsPage slug={slug} />
}
