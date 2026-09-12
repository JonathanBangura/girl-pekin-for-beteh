import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashTicketToken } from '@/lib/ticketing/ticket-security'

export const runtime = 'nodejs'

function clean(value: unknown, max = 300) {
  return String(value ?? '').trim().slice(0, max)
}

function extractQrToken(value: string) {
  const trimmed = value.trim()

  if (trimmed.startsWith('GPFB:TICKET:')) {
    return trimmed.slice('GPFB:TICKET:'.length).trim()
  }

  return trimmed
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

  const eventId = clean(body.event_id, 80)
  const qrPayload = clean(body.qr_payload, 600)
  const ticketCode = clean(body.ticket_code, 80)
  const deviceLabel = clean(body.device_label, 120)

  if (!eventId || (!qrPayload && !ticketCode)) {
    return NextResponse.json(
      {
        error:
          'Select an event and provide a QR ticket or ticket code.',
      },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    )
  }

  const [
    { data: canCheckIn },
    { data: canManageEvent },
  ] = await Promise.all([
    supabase.rpc('has_permission', {
      requested_permission_code: 'checkin.use',
      requested_scope_type: 'event',
      requested_scope_id: eventId,
    }),
    supabase.rpc('has_permission', {
      requested_permission_code: 'events.manage',
      requested_scope_type: 'event',
      requested_scope_id: eventId,
    }),
  ])

  if (canCheckIn !== true && canManageEvent !== true) {
    return NextResponse.json(
      { error: 'You are not authorized to check in this event.' },
      { status: 403 },
    )
  }

  const qrHash = qrPayload
    ? hashTicketToken(extractQrToken(qrPayload))
    : null

  const { data, error } = await supabase.rpc('check_in_ticket', {
    p_event_id: eventId,
    p_qr_token_hash: qrHash,
    p_ticket_code: ticketCode || null,
    p_device_label: deviceLabel || null,
  })

  if (error) {
    console.error('check_in_ticket RPC failed', error)

    return NextResponse.json(
      {
        error:
          error.code === '42501'
            ? 'You are not authorized to check in this event.'
            : 'Ticket validation failed. Please try again.',
      },
      { status: error.code === '42501' ? 403 : 500 },
    )
  }

  const result = data?.[0]

  if (!result) {
    return NextResponse.json(
      { error: 'Ticket validation returned no result.' },
      { status: 500 },
    )
  }

  return NextResponse.json(result)
}
