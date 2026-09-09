import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function clean(value: unknown, max = 200) {
  return String(value ?? '').trim().slice(0, max)
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    )
  }

  const eventSlug = clean(body.event_slug, 120)
  const ticketTypeId = clean(body.ticket_type_id, 80)
  const quantity = Number(body.quantity)
  const donationPerTicket =
    body.donation_per_ticket == null ||
    body.donation_per_ticket === ''
      ? null
      : Number(body.donation_per_ticket)
  const purchaserName = clean(body.purchaser_name, 120)
  const purchaserEmail = clean(body.purchaser_email, 180).toLowerCase()
  const purchaserPhone = clean(body.purchaser_phone, 40)

  if (
    !eventSlug ||
    !ticketTypeId ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !purchaserName ||
    (!purchaserEmail && !purchaserPhone)
  ) {
    return NextResponse.json(
      {
        error:
          'Please provide a valid event, ticket type, quantity and contact details.',
      },
      { status: 400 },
    )
  }

  if (
    donationPerTicket != null &&
    (!Number.isFinite(donationPerTicket) || donationPerTicket < 0)
  ) {
    return NextResponse.json(
      { error: 'Donation amount is invalid.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data, error } = await admin.rpc(
    'create_ticket_order_reservation',
    {
      p_event_slug: eventSlug,
      p_ticket_type_id: ticketTypeId,
      p_quantity: quantity,
      p_donation_per_ticket: donationPerTicket,
      p_purchaser_name: purchaserName,
      p_purchaser_email: purchaserEmail || null,
      p_purchaser_phone: purchaserPhone || null,
    },
  )

  if (error || !data?.length) {
    console.error('create ticket order reservation', error)

    const message = error?.message || 'Unable to create ticket order.'

    return NextResponse.json(
      {
        error:
          message.includes('capacity')
            ? 'There are not enough tickets remaining for this selection.'
            : message.includes('sales')
              ? 'Ticket sales are not currently open.'
              : message.includes('Donation')
                ? 'Please enter a valid donation per ticket.'
                : message.includes('Maximum quantity')
                  ? message
                  : 'Unable to create the ticket order. Please review your selection.',
      },
      { status: 409 },
    )
  }

  const order = data[0]

  return NextResponse.json(
    {
      order_number: order.order_number,
      order_token: order.public_token,
      amount: order.total_amount,
      currency: order.currency,
      payment_status: 'pending',
      payment_adapter_ready: false,
      status_url: `/tickets/order/${order.public_token}`,
      message:
        'Ticket order created. Vult payment initiation will be enabled after the provider API contract is connected.',
    },
    { status: 201 },
  )
}
