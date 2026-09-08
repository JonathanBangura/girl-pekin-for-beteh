import { PublicAwardEditionLivePage } from '@/components/public/live-awards'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <PublicAwardEditionLivePage slug={slug} />
}
