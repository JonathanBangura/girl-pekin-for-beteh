import { ProgramDetailLivePage } from '@/components/public/cms-pages'

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <ProgramDetailLivePage slug={slug} />
}
