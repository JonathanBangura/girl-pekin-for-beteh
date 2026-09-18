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

  const token = clean(
    body.token,
    80,
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
    !token ||
    !name ||
    (!email && !phone)
  ) {
    return NextResponse.json(
      {
        error:
          'Provide your name and an email address or phone number.',
      },
      { status: 400 },
    )
  }

  const admin =
    createAdminClient()

  const { data, error } =
    await admin.rpc(
      'claim_event_invitation',
      {
        p_invite_token:
          token,
        p_claimant_name:
          name,
        p_claimant_email:
          email || null,
        p_claimant_phone:
          phone || null,
      },
    )

  const order = data?.[0]

  if (error || !order) {
    console.error(
      'claim_event_invitation',
      error,
    )

    const message =
      error?.message || ''

    return NextResponse.json(
      {
        error:
          message.includes(
            'expired',
          )
            ? 'This invitation has expired.'
            : message.includes(
                  'not available',
                )
              ? 'This invitation is no longer available.'
              : message.includes(
                    'capacity',
                  )
                ? 'This invitation cannot be claimed because event capacity has been reached.'
                : 'Invitation could not be claimed.',
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
        'invitation ticket email failed',
        deliveryError,
      )
    }
  } catch (issueError) {
    console.error(
      'invitation ticket issuance failed',
      issueError,
    )

    return NextResponse.json(
      {
        error:
          'Invitation was confirmed, but ticket issuance needs staff attention.',
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
