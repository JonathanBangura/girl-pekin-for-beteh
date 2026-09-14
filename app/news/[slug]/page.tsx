import { NewsDetailLivePage } from '@/components/public/cms-pages'

export default async function NewsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <NewsDetailLivePage slug={slug} />
}
