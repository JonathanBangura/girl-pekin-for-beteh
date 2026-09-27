import { PortalLayout } from '@/components/portal/portal'
import { requireAnyAssignedPermission } from '@/lib/auth/guards'
import { privateMetadata } from '@/lib/seo/site'

export const metadata = privateMetadata

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAnyAssignedPermission(
    'admin.access',
    '/admin',
  )

  return <PortalLayout admin>{children}</PortalLayout>
}
