import {
  NextResponse,
  type NextRequest,
} from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueTicketsForOrder } from '@/lib/ticketing/ticket-issuance'
import { deliverTicketOrderEmail } from '@/lib/ticketing/ticket-email'

function clean(
  value: unknown,
  max = 180,
) {
  return String(value ?? '')
    .trim()
    .slice(0, max)
}

export async function POST(
  request: NextRequest,
) {
  let body: Record<
    string,
    unknown
  >

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid request body.',
      },
      { status: 400 },
    )
  }

  const eventSlug = clean(
    body.event_slug,
    120,
  )
  const ticketTypeId = clean(
    body.ticket_type_id,
    80,
  )
  const quantity = Number(
    body.quantity,
  )
  const name = clean(
    body.name,
    120,
  )
  const email = clean(
    body.email,
    180,
  ).toLowerCase()
  const phone = clean(
    body.phone,
    50,
  )

  if (
    !eventSlug ||
    !ticketTypeId ||
    !name ||
    !Number.isInteger(
      quantity,
    ) ||
    quantity <= 0 ||
    (!email && !phone)
  ) {
    return NextResponse.json(
      {
        error:
          'Provide a valid registration type, quantity, name and email or phone number.',
      },
      { status: 400 },
    )
  }

  const admin =
    createAdminClient()

  const { data, error } =
    await admin.rpc(
      'create_free_event_registration',
      {
        p_event_slug:
          eventSlug,
        p_ticket_type_id:
          ticketTypeId,
        p_quantity: quantity,
        p_registrant_name:
          name,
        p_registrant_email:
          email || null,
        p_registrant_phone:
          phone || null,
      },
    )

  const order = data?.[0]

  if (error || !order) {
    console.error(
      'create_free_event_registration',
      error,
    )

    const message =
      error?.message || ''

    return NextResponse.json(
      {
        error:
          message.includes(
            'already exists',
          )
            ? 'A confirmed registration already exists for these contact details.'
            : message.includes(
                  'capacity',
                )
              ? 'This registration is no longer available because capacity has been reached.'
              : message.includes(
                    'has not started',
                  )
                ? 'Registration has not started yet.'
                : message.includes(
                      'has ended',
                    )
                  ? 'Registration has ended.'
                  : 'Registration could not be completed.',
      },
      { status: 409 },
    )
  }

  try {
    await issueTicketsForOrder(
      order.ticket_order_id,
    )

    try {
      await deliverTicketOrderEmail(
        order.ticket_order_id,
      )
    } catch (deliveryError) {
      console.error(
        'free registration ticket email failed',
        deliveryError,
      )
    }
  } catch (issueError) {
    console.error(
      'free registration ticket issuance failed',
      issueError,
    )

    return NextResponse.json(
      {
        error:
          'Registration was confirmed, but ticket issuance needs staff attention.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    confirmed: true,
    order_number:
      order.order_number,
    wallet_url:
      `/tickets/order/${order.public_token}`,
  })
}
