import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverTicketOrderEmail } from '@/lib/ticketing/ticket-email'

export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  context: {
    params: Promise<{ token: string }>
  },
) {
  const { token } = await context.params
  const admin = createAdminClient()

  const { data: order } = await admin
    .from('ticket_orders')
    .select('id,status,purchaser_email')
    .eq('public_token', token)
    .maybeSingle()

  if (!order) {
    return NextResponse.json(
      { error: 'Ticket order not found.' },
      { status: 404 },
    )
  }

  if (order.status !== 'paid') {
    return NextResponse.json(
      { error: 'Tickets can be emailed only after payment is confirmed.' },
      { status: 409 },
    )
  }

  if (!order.purchaser_email) {
    return NextResponse.json(
      { error: 'No email address is attached to this ticket order.' },
      { status: 409 },
    )
  }

  const oneHourAgo = new Date(
    Date.now() - 60 * 60 * 1000,
  ).toISOString()

  const { count } = await admin
    .from('ticket_delivery_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_order_id', order.id)
    .gte('attempted_at', oneHourAgo)

  if ((count ?? 0) >= 4) {
    return NextResponse.json(
      {
        error:
          'Too many email attempts. Please wait before trying again.',
      },
      { status: 429 },
    )
  }

  try {
    await deliverTicketOrderEmail(order.id, {
      force: true,
    })

    return NextResponse.json({
      sent: true,
    })
  } catch (error) {
    console.error('ticket email resend failed', error)

    return NextResponse.json(
      {
        error:
          'The ticket email could not be sent. Please try again later.',
      },
      { status: 502 },
    )
  }
}
