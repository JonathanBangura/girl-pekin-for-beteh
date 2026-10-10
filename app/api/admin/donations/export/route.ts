import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function csvCell(value: unknown) {
  let text = String(value ?? '')

  // Prevent spreadsheet formula execution when an exported donor-entered
  // value begins with a formula marker.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`
  }

  return `"${text.replaceAll('"', '""')}"`
}

function csv(rows: unknown[][]) {
  return rows
    .map((row) => row.map(csvCell).join(','))
    .join('\n')
}

function dateStart(value: string | null) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString()
}

function dateEnd(value: string | null) {
  if (!value) return null
  const parsed = new Date(`${value}T23:59:59.999Z`)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString()
}

function methodLabel(value?: string | null) {
  if (value === 'in-app') return 'Vult App'
  if (value === 'momo') return 'Mobile Money'
  if (value === 'card') return 'Card'
  return 'Unknown'
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    )
  }

  const [readPermission, managePermission] = await Promise.all([
    supabase.rpc('has_permission', {
      requested_permission_code: 'donations.read',
      requested_scope_type: null,
      requested_scope_id: null,
    }),
    supabase.rpc('has_permission', {
      requested_permission_code: 'donations.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    }),
  ])

  if (
    readPermission.data !== true &&
    managePermission.data !== true
  ) {
    return NextResponse.json(
      { error: 'Donation reporting access required.' },
      { status: 403 },
    )
  }

  const from = dateStart(
    request.nextUrl.searchParams.get('from'),
  )
  const to = dateEnd(
    request.nextUrl.searchParams.get('to'),
  )

  const admin = createAdminClient()

  let query = admin
    .from('donations')
    .select(
      `
      donation_number,
      donor_type,
      donor_name,
      organisation_name,
      donor_email,
      donor_phone,
      is_anonymous,
      amount,
      currency,
      paid_at,
      campaign:donation_campaigns(title,slug,fund_type),
      payment:payments!payments_donation_id_fkey(
        provider_transaction_id,
        provider_payload
      )
      `,
    )
    .eq('status', 'succeeded')
    .order('paid_at', { ascending: false })
    .limit(10000)

  if (from) query = query.gte('paid_at', from)
  if (to) query = query.lte('paid_at', to)

  const { data, error } = await query

  if (error) {
    console.error('donation CSV export', error)
    return NextResponse.json(
      { error: 'Unable to export donations.' },
      { status: 500 },
    )
  }

  const rows: unknown[][] = [
    [
      'Donation Reference',
      'Donor Display',
      'Donor Type',
      'Donor Email',
      'Donor Phone',
      'Anonymous',
      'Campaign',
      'Fund Type',
      'Amount',
      'Currency',
      'Payment Method',
      'Provider Transaction ID',
      'Paid At',
    ],
  ]

  for (const item of data ?? []) {
    const campaignRaw = (item as any).campaign
    const campaign = Array.isArray(campaignRaw)
      ? campaignRaw[0]
      : campaignRaw

    const paymentRaw = (item as any).payment
    const payment = Array.isArray(paymentRaw)
      ? paymentRaw[0]
      : paymentRaw

    const providerPayload =
      payment?.provider_payload &&
      typeof payment.provider_payload === 'object'
        ? payment.provider_payload
        : {}

    const displayName = item.is_anonymous
      ? 'Anonymous Donor'
      : item.donor_type === 'organisation'
        ? item.organisation_name ||
          item.donor_name ||
          'Organisation Donor'
        : item.donor_name || 'Donor'

    rows.push([
      item.donation_number,
      displayName,
      item.donor_type,
      item.donor_email,
      item.donor_phone,
      item.is_anonymous ? 'Yes' : 'No',
      campaign?.title ?? '',
      campaign?.fund_type ?? '',
      item.amount,
      item.currency,
      methodLabel(providerPayload.payment_method),
      payment?.provider_transaction_id ?? '',
      item.paid_at ?? '',
    ])
  }

  return new NextResponse(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="gpfb-donations.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
