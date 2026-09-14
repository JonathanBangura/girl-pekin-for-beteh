import { NomineeCommunicationAdminPage } from '@/components/portal/nominee-communication-admin'

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function CommunicationPage({
  searchParams,
}: PageProps) {
  const params = await searchParams

  return <NomineeCommunicationAdminPage params={params} />
}
