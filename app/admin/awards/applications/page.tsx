import { ApplicationsManagementPage } from '@/components/portal/applications-management'

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function ApplicationsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  return <ApplicationsManagementPage params={params} />
}
