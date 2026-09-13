import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function csv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
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

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: claimsData } =
    await supabase.auth.getClaims()

  if (!claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    )
  }

  const { data: allowed, error: permissionError } =
    await supabase.rpc('has_permission', {
      requested_permission_code: 'finance.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    })

  if (permissionError || allowed !== true) {
    return NextResponse.json(
      { error: 'Finance permission required.' },
      { status: 403 },
    )
  }

  const report =
    request.nextUrl.searchParams.get('report') ?? ''
  const from = dateStart(
    request.nextUrl.searchParams.get('from'),
  )
  const to = dateEnd(
    request.nextUrl.searchParams.get('to'),
  )

  const admin = createAdminClient()
  let content = ''
  let filename = ''

  if (report === 'payments') {
    let query = admin
      .from('payments')
      .select(
        'id,payment_type,provider,provider_transaction_id,amount,currency,status,payer_name,payer_email,payer_phone,paid_at,created_at,vote_order_id,ticket_order_id',
      )
      .in('status', [
        'succeeded',
        'refunded',
        'partially_refunded',
        'reversed',
      ])
      .not('paid_at', 'is', null)
      .order('paid_at', { ascending: false })

    if (from) query = query.gte('paid_at', from)
    if (to) query = query.lte('paid_at', to)

    const { data, error } = await query

    if (error) {
      console.error('payments export', error)
      return NextResponse.json(
        { error: 'Unable to export payments.' },
        { status: 500 },
      )
    }

    content = csv([
      [
        'Payment ID',
        'Type',
        'Provider',
        'Provider Transaction ID',
        'Amount',
        'Currency',
        'Status',
        'Payer Name',
        'Payer Email',
        'Payer Phone',
        'Paid At',
        'Created At',
        'Vote Order ID',
        'Ticket Order ID',
      ],
      ...(data ?? []).map((row) => [
        row.id,
        row.payment_type,
        row.provider,
        row.provider_transaction_id,
        row.amount,
        row.currency,
        row.status,
        row.payer_name,
        row.payer_email,
        row.payer_phone,
        row.paid_at,
        row.created_at,
        row.vote_order_id,
        row.ticket_order_id,
      ]),
    ])
    filename = 'gpfb-payments.csv'
  } else if (report === 'refunds') {
    let query = admin
      .from('refunds')
      .select(
        'id,payment_id,amount,status,refund_kind,provider_refund_id,external_method,reason,notes,processed_at,provider_confirmed_at,created_at',
      )
      .eq('status', 'succeeded')
      .order('processed_at', { ascending: false })

    if (from) query = query.gte('processed_at', from)
    if (to) query = query.lte('processed_at', to)

    const { data, error } = await query

    if (error) {
      console.error('refund export', error)
      return NextResponse.json(
        { error: 'Unable to export refunds.' },
        { status: 500 },
      )
    }

    content = csv([
      [
        'Refund ID',
        'Payment ID',
        'Amount',
        'Status',
        'Kind',
        'External Reference',
        'External Method',
        'Reason',
        'Notes',
        'Processed At',
        'Provider Confirmed At',
        'Created At',
      ],
      ...(data ?? []).map((row) => [
        row.id,
        row.payment_id,
        row.amount,
        row.status,
        row.refund_kind,
        row.provider_refund_id,
        row.external_method,
        row.reason,
        row.notes,
        row.processed_at,
        row.provider_confirmed_at,
        row.created_at,
      ]),
    ])
    filename = 'gpfb-refunds.csv'
  } else {
    return NextResponse.json(
      { error: 'Unknown finance report.' },
      { status: 400 },
    )
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
