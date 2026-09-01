import { PortalDashboard } from '@/components/foundation'
export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) { await params; return <PortalDashboard admin /> }
