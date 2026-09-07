import { requireAnyPermission } from '@/lib/auth/guards'

export default async function ScanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAnyPermission(['checkin.use', 'events.manage'], '/scan')

  return children
}
