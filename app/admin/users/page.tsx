import { UsersRolesManagementPage } from '@/components/portal/users-roles-audit'

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function UsersPage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return <UsersRolesManagementPage params={params} />
}
