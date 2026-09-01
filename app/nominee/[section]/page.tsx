import { PortalDashboard } from '@/components/foundation'
export default async function NomineeSectionPage({ params }: { params: Promise<{ section: string }> }) { await params; return <PortalDashboard /> }
