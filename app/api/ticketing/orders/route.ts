import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createVultPaymentLink,
  isVultPaymentMethod,
  publicVultErrorMessage,
} from '@/lib/vult/client'

function clean(value: unknown, max = 200) {
  return String(value ?? '').trim().slice(0, max)
}

function reservationErrorMessage(error: {
  code?: string
  message?: string
} | null) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''

  if (
    code === 'PGRST202' ||
    (message.includes('create_ticket_order_reservation') &&
      message.includes('Could not find'))
  ) {
    return 'The ticketing backend function is not available. Apply the Phase 6A ticketing migration before creating orders.'
  }

  if (
    message.includes('gen_random_bytes') ||
    message.includes('digest')
  ) {
    return 'The ticketing security functions are not available to the reservation workflow. Apply migration 0008_ticketing_rpc_hotfix.sql.'
  }

  if (message.includes('Event is not available')) {
    return 'This event is not currently available for paid ticket sales.'
  }

  if (message.includes('Ticket type is not available')) {
    return 'This ticket type is not currently available.'
  }

  if (
    message.includes('Ticket sales have not started') ||
    message.includes('Ticket sales have ended')
  ) {
    return 'Ticket sales are not currently open.'
  }

  if (message.includes('capacity')) {
    return 'There are not enough tickets remaining for this selection.'
  }

  if (message.includes('Donation')) {
    return 'Please enter a valid donation per ticket.'
  }

  if (message.includes('Maximum quantity')) {
    return message
  }

  if (message.includes('Ticket quantity')) {
    return 'Please enter a valid ticket quantity.'
  }

  if (message.includes('Purchaser name')) {
    return 'Please enter the purchaser name.'
  }

  if (message.includes('Email or phone')) {
    return 'Please provide an email address or phone number.'
  }

  if (message.includes('Free registration')) {
    return 'This is a free-registration ticket and does not use the paid checkout.'
  }

  return 'Unable to create the ticket order. Please review your selection.'
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
  const purchaserEmail = clean(
    body.purchaser_email,
    180,
  ).toLowerCase()
  const purchaserPhone = clean(body.purchaser_phone, 40)
  const paymentMethod = body.payment_method

  if (
    !eventSlug ||
    !ticketTypeId ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !purchaserName ||
    (!purchaserEmail && !purchaserPhone) ||
    !isVultPaymentMethod(paymentMethod)
  ) {
    return NextResponse.json(
      {
        error:
          'Please provide a valid event, ticket type, quantity, contact details and payment method.',
      },
      { status: 400 },
    )
  }

  if (
    donationPerTicket != null &&
    (!Number.isFinite(donationPerTicket) ||
      donationPerTicket < 0)
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
    console.error('create ticket order reservation', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      eventSlug,
      ticketTypeId,
      quantity,
    })

    return NextResponse.json(
      { error: reservationErrorMessage(error) },
      { status: 409 },
    )
  }

  const order = data[0]

  try {
    const vult = await createVultPaymentLink({
      orderId: order.order_number,
      amount: Number(order.total_amount),
      currency: order.currency,
      paymentMethod,
    })

    await Promise.all([
      admin
        .from('payments')
        .update({
          status: 'processing',
          provider_payload: {
            integration_status: 'payment_link_created',
            payment_method: paymentMethod,
            api_type: vult.apiType,
            link: vult.link,
            code: vult.code,
            initiated_at: new Date().toISOString(),
          },
          failure_reason: null,
        })
        .eq('id', order.payment_id),
      admin
        .from('ticket_orders')
        .update({ status: 'payment_pending' })
        .eq('id', order.ticket_order_id),
    ])

    return NextResponse.json(
      {
        order_number: order.order_number,
        order_token: order.public_token,
        amount: order.total_amount,
        currency: order.currency,
        payment_status: 'processing',
        payment_url: vult.link,
        payment_code: vult.code,
        payment_method: paymentMethod,
        status_url: `/payment/vult/ticket/${order.public_token}`,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(
      'Vult ticket payment initialization failed',
      error,
    )

    const safeMessage = publicVultErrorMessage(
      error,
      paymentMethod,
    )

    await Promise.all([
      admin
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: safeMessage,
          provider_payload: {
            integration_status: 'payment_link_failed',
            payment_method: paymentMethod,
          },
        })
        .eq('id', order.payment_id),
      admin
        .from('ticket_orders')
        .update({ status: 'cancelled' })
        .eq('id', order.ticket_order_id),
    ])

    return NextResponse.json(
      { error: safeMessage },
      { status: 502 },
    )
  }
}
