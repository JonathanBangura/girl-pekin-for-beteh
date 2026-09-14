import { NextResponse, type NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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

  const { data: nominee, error } = await supabase
    .from('nominees')
    .select('nominee_code')
    .eq('auth_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !nominee) {
    return NextResponse.json(
      { error: 'Linked nominee not found.' },
      { status: 404 },
    )
  }

  const voteUrl = `${request.nextUrl.origin}/vote/${encodeURIComponent(
    nominee.nominee_code,
  )}`

  const png = await QRCode.toBuffer(voteUrl, {
    type: 'png',
    width: 900,
    margin: 3,
    errorCorrectionLevel: 'M',
  })

  const download =
    request.nextUrl.searchParams.get('download') === '1'

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      ...(download
        ? {
            'Content-Disposition': `attachment; filename="${nominee.nominee_code}-voting-qr.png"`,
          }
        : {}),
    },
  })
}
