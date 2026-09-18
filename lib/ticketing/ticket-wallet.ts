import { createAdminClient } from '@/lib/supabase/admin'
import { issueTicketsForOrder } from './ticket-issuance'

export async function getTicketWalletData(
  publicToken: string,
) {
  const admin =
    createAdminClient()

  const { data: order, error } =
    await admin
      .from('ticket_orders')
      .select(
        'id,order_number,event_id,status,source_type,public_token,delivery_status,purchaser_email,total_amount,currency,created_at',
      )
      .eq(
        'public_token',
        publicToken,
      )
      .maybeSingle()

  if (error || !order) {
    return null
  }

  const { data: event } =
    await admin
      .from('events')
      .select(
        'id,title,slug,venue,starts_at',
      )
      .eq('id', order.event_id)
      .maybeSingle()

  if (!event) {
    return null
  }

  if (
    !['paid', 'confirmed'].includes(
      order.status,
    )
  ) {
    return {
      order,
      event,
      tickets: [],
      canResendEmail: Boolean(
        order.purchaser_email,
      ),
    }
  }

  const issued =
    await issueTicketsForOrder(
      order.id,
    )

  return {
    order,
    event,
    tickets: issued.tickets,
    canResendEmail: Boolean(
      order.purchaser_email,
    ),
  }
}
