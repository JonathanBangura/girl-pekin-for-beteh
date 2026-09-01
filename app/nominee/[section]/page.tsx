import { PortalDashboard } from '@/components/portal/portal'
export default async function NomineeSectionPage({ params }: { params: Promise<{ section: string }> }) { await params; return <PortalDashboard /> }
