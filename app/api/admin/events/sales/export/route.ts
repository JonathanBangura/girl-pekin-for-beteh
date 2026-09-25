import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function csvCell(value: unknown) {
  const text = String(value ?? '')
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

function paymentMethodLabel(value?: string | null) {
  if (value === 'in-app') return 'Vult App'
  if (value === 'momo') return 'Mobile Money'
  if (value === 'card') return 'Card'
  return 'Unknown'
}

function safeFilename(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'event'
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

  const eventId =
    request.nextUrl.searchParams.get('event_id')?.trim() ?? ''

  if (!eventId) {
    return NextResponse.json(
      { error: 'Event is required.' },
      { status: 400 },
    )
  }

  const { data: accessibleEvents, error: accessError } =
    await supabase.rpc('event_sales_accessible_events')

  if (accessError) {
    console.error('event sales export access', accessError)
    return NextResponse.json(
      { error: 'Unable to verify event access.' },
      { status: 500 },
    )
  }

  const event = (accessibleEvents ?? []).find(
    (item: {
      id: string
      title: string
      slug: string
    }) => item.id === eventId,
  )

  if (!event) {
    return NextResponse.json(
      { error: 'Event access required.' },
      { status: 403 },
    )
  }

  const validStatuses = new Set([
    'succeeded',
    'refunded',
    'partially_refunded',
    'reversed',
  ])
  const validMethods = new Set([
    'in-app',
    'momo',
    'card',
    'unknown',
  ])

  const rawStatus =
    request.nextUrl.searchParams.get('status')?.trim() ?? ''
  const rawMethod =
    request.nextUrl.searchParams.get('method')?.trim() ?? ''

  const status = validStatuses.has(rawStatus)
    ? rawStatus
    : null
  const method = validMethods.has(rawMethod)
    ? rawMethod
    : null
  const from = dateStart(
    request.nextUrl.searchParams.get('from'),
  )
  const to = dateEnd(
    request.nextUrl.searchParams.get('to'),
  )

  const admin = createAdminClient()
  const pageSize = 100

  type ExportRow = {
    payment_id: string
    ticket_order_id: string
    order_number: string
    purchaser_name: string
    purchaser_email: string | null
    purchaser_phone: string | null
    ticket_types: string
    units: number | string
    admissions: number | string
    payment_method: string
    provider: string
    gross_amount: number | string
    currency: string
    payment_status: string
    order_status: string
    paid_at: string
    refund_amount: number | string
    current_net: number | string
    total_count: number | string
  }

  const rows: ExportRow[] = []

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.rpc(
      'event_sales_page',
      {
        p_event_id: eventId,
        p_from: from,
        p_to: to,
        p_status: status,
        p_method: method,
        p_page: page,
        p_page_size: pageSize,
      },
    )

    if (error) {
      console.error('event sales export', error)
      return NextResponse.json(
        { error: 'Unable to export event sales.' },
        { status: 500 },
      )
    }

    const batch = (data ?? []) as ExportRow[]
    rows.push(...batch)

    if (batch.length < pageSize) break
  }

  const content = csv([
    [
      'Order',
      'Payment ID',
      'Ticket Order ID',
      'Purchaser Name',
      'Purchaser Email',
      'Purchaser Phone',
      'Ticket Types',
      'Units',
      'Admissions',
      'Payment Method',
      'Provider',
      'Gross Amount',
      'Refund Amount',
      'Current Net',
      'Currency',
      'Payment Status',
      'Order Status',
      'Paid At',
    ],
    ...rows.map((row) => [
      row.order_number,
      row.payment_id,
      row.ticket_order_id,
      row.purchaser_name,
      row.purchaser_email,
      row.purchaser_phone,
      row.ticket_types,
      row.units,
      row.admissions,
      paymentMethodLabel(row.payment_method),
      row.provider,
      row.gross_amount,
      row.refund_amount,
      row.current_net,
      row.currency,
      row.payment_status,
      row.order_status,
      row.paid_at,
    ]),
  ])

  const filename = `gpfb-event-sales-${safeFilename(
    event.slug || event.title,
  )}.csv`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
