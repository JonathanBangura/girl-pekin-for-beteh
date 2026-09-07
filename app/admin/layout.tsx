import { PortalLayout } from '@/components/portal/portal'
import { requirePermission } from '@/lib/auth/guards'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission('admin.access', '/admin')

  return <PortalLayout admin>{children}</PortalLayout>
}
