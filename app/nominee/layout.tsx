import { PortalLayout } from '@/components/portal/portal'
import { requirePermission } from '@/lib/auth/guards'

export default async function NomineeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('nominee.portal', '/nominee')

  return <PortalLayout>{children}</PortalLayout>
}
