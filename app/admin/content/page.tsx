import { ContentManagementLivePage } from '@/components/portal/cms-management'

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function ContentPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  return <ContentManagementLivePage params={params} />
}
