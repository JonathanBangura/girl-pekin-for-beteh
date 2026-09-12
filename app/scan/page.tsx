import { Scanner } from '@/components/scanner/scanner'
import { getScannerBootstrapData } from '@/lib/checkin/data'

export default async function ScanPage() {
  const data = await getScannerBootstrapData()
  return <Scanner {...data} />
}
