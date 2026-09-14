import { ProgramsManagementLivePage } from '@/components/portal/cms-management'

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function ProgramsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  return <ProgramsManagementLivePage params={params} />
}
