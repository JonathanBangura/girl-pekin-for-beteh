import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  makeTicketQrPayload,
  makeTicketToken,
} from '@/lib/ticketing/ticket-security'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: claimsData } =
    await supabase.auth.getClaims()

  const userId = claimsData?.claims?.sub

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    )
  }

  const { data: portalAllowed } = await supabase.rpc(
    'has_permission',
    {
      requested_permission_code: 'nominee.portal',
      requested_scope_type: null,
      requested_scope_id: null,
    },
  )

  if (portalAllowed !== true) {
    return NextResponse.json(
      { error: 'Nominee Portal access required.' },
      { status: 403 },
    )
  }

  const { data: nominee } = await supabase
    .from('nominees')
    .select('id')
    .eq('auth_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!nominee) {
    return NextResponse.json(
      { error: 'Linked nominee not found.' },
      { status: 404 },
    )
  }

  const admin = createAdminClient()

  const { data: pass } = await admin
    .from('nominee_ceremony_passes')
    .select('ticket_id,status')
    .eq('nominee_id', nominee.id)
    .eq('status', 'active')
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pass) {
    return NextResponse.json(
      { error: 'Active ceremony pass not found.' },
      { status: 404 },
    )
  }

  const { data: ticket } = await admin
    .from('tickets')
    .select('id,status')
    .eq('id', pass.ticket_id)
    .maybeSingle()

  if (!ticket || ticket.status !== 'active') {
    return NextResponse.json(
      { error: 'Ceremony ticket is not active.' },
      { status: 409 },
    )
  }

  const rawToken = makeTicketToken(ticket.id)
  const payload = makeTicketQrPayload(rawToken)

  const png = await QRCode.toBuffer(payload, {
    type: 'png',
    width: 900,
    margin: 3,
    errorCorrectionLevel: 'M',
  })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
    },
  })
}
