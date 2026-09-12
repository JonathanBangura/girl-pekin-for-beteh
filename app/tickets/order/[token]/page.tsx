import { TicketWallet } from '@/components/ticketing/ticket-wallet'

export default async function TicketOrderPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <TicketWallet token={token} />
}
