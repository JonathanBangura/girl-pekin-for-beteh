import { requireAuthenticated } from '@/lib/auth/guards'

export default async function ScanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuthenticated('/scan')
  return children
}
