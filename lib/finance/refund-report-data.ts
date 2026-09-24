import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isoDateStart(value?: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString()
}

function isoDateEnd(value?: string) {
  if (!value) return null
  const date = new Date(`${value}T23:59:59.999Z`)
  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString()
}

export async function getRefundManagementData() {
  await requirePermission(
    'finance.manage',
    '/admin/finance/refunds',
  )

  const admin = createAdminClient()

  const [
    paymentsResult,
    refundsResult,
    voteOrdersResult,
    ticketOrdersResult,
  ] = await Promise.all([
    admin
      .from('payments')
      .select(
        'id,payment_type,vote_order_id,ticket_order_id,provider,provider_transaction_id,amount,currency,status,payer_name,payer_email,payer_phone,paid_at,created_at',
      )
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('refunds')
      .select(
        'id,payment_id,amount,reason,provider_refund_id,status,requested_by,processed_at,created_at,refund_kind,external_method,notes,completed_by,provider_confirmed_at',
      )
      .order('created_at', { ascending: false })
      .limit(250),
    admin
      .from('vote_orders')
      .select('id,order_number,status'),
    admin
      .from('ticket_orders')
      .select('id,order_number,status'),
  ])

  for (const [label, result] of [
    ['payments', paymentsResult],
    ['refunds', refundsResult],
    ['vote orders', voteOrdersResult],
    ['ticket orders', ticketOrdersResult],
  ] as const) {
    if (result.error) {
      console.error(`refund management ${label}`, result.error)
      throw new Error(`Unable to load ${label}.`)
    }
  }

  const voteMap = new Map(
    (voteOrdersResult.data ?? []).map((order) => [
      order.id,
      order,
    ]),
  )
  const ticketMap = new Map(
    (ticketOrdersResult.data ?? []).map((order) => [
      order.id,
      order,
    ]),
  )

  const paymentIdsWithSuccessfulRefund = new Set(
    (refundsResult.data ?? [])
      .filter((refund) => refund.status === 'succeeded')
      .map((refund) => refund.payment_id),
  )

  const eligiblePayments = (paymentsResult.data ?? [])
    .filter(
      (payment) =>
        payment.status === 'succeeded' &&
        !paymentIdsWithSuccessfulRefund.has(payment.id),
    )
    .map((payment) => {
      const order =
        payment.vote_order_id
          ? voteMap.get(payment.vote_order_id)
          : payment.ticket_order_id
            ? ticketMap.get(payment.ticket_order_id)
            : null

      return {
        ...payment,
        amount_number: toNumber(payment.amount),
        order_number: order?.order_number ?? '—',
        order_status: order?.status ?? null,
      }
    })
    .filter((payment) => {
      if (payment.payment_type === 'donation') return true
      return payment.order_status === 'paid'
    })

  const paymentMap = new Map(
    (paymentsResult.data ?? []).map((payment) => [
      payment.id,
      payment,
    ]),
  )

  const refunds = (refundsResult.data ?? []).map(
    (refund) => {
      const payment = paymentMap.get(refund.payment_id)
      const order =
        payment?.vote_order_id
          ? voteMap.get(payment.vote_order_id)
          : payment?.ticket_order_id
            ? ticketMap.get(payment.ticket_order_id)
            : null

      return {
        ...refund,
        amount_number: toNumber(refund.amount),
        payment_type: payment?.payment_type ?? '—',
        provider: payment?.provider ?? '—',
        currency: payment?.currency ?? 'SLE',
        payer_name: payment?.payer_name ?? null,
        order_number: order?.order_number ?? '—',
      }
    },
  )

  return {
    eligiblePayments,
    refunds,
  }
}

export async function getFinanceReportsData(filters: {
  from?: string
  to?: string
}) {
  await requirePermission(
    'finance.manage',
    '/admin/finance/reports',
  )

  const admin = createAdminClient()
  const from = isoDateStart(filters.from)
  const to = isoDateEnd(filters.to)

  const { data, error } = await admin.rpc('finance_report_summary', {
    p_from: from,
    p_to: to,
  })

  if (error) {
    console.error('finance report summary', error)
    throw new Error('Unable to load finance reports.')
  }

  type ReportRow = {
    payment_count: number | string
    refund_count: number | string
    by_currency: unknown
    by_type: unknown
    by_method: unknown
    recent_refunds: unknown
  }

  const report = (data?.[0] ?? null) as ReportRow | null

  const byCurrency = Array.isArray(report?.by_currency)
    ? report.by_currency.map((row) => {
        const item = row as Record<string, unknown>
        return {
          currency: String(item.currency ?? 'SLE'),
          gross: toNumber(item.gross),
          refunds: toNumber(item.refunds),
          net: toNumber(item.net),
        }
      })
    : []

  const byType = Array.isArray(report?.by_type)
    ? report.by_type.map((row) => {
        const item = row as Record<string, unknown>
        return {
          payment_type: String(item.payment_type ?? 'unknown'),
          currency: String(item.currency ?? 'SLE'),
          count: toNumber(item.count),
          amount: toNumber(item.amount),
        }
      })
    : []

  const byMethod = Array.isArray(report?.by_method)
    ? report.by_method.map((row) => {
        const item = row as Record<string, unknown>
        const rawMethod = String(item.payment_method ?? 'unknown')
        return {
          payment_method:
            rawMethod === 'in-app' || rawMethod === 'momo' || rawMethod === 'card'
              ? rawMethod
              : 'unknown',
          currency: String(item.currency ?? 'SLE'),
          count: toNumber(item.count),
          amount: toNumber(item.amount),
        }
      })
    : []

  const recentRefunds = Array.isArray(report?.recent_refunds)
    ? report.recent_refunds.map((row) => {
        const item = row as Record<string, unknown>
        return {
          id: String(item.id ?? ''),
          payment_id: String(item.payment_id ?? ''),
          amount: toNumber(item.amount),
          status: String(item.status ?? ''),
          refund_kind: String(item.refund_kind ?? ''),
          processed_at:
            typeof item.processed_at === 'string'
              ? item.processed_at
              : null,
          created_at: String(item.created_at ?? ''),
          currency: String(item.currency ?? 'SLE'),
          payment_type: String(item.payment_type ?? '—'),
          provider: String(item.provider ?? '—'),
        }
      })
    : []

  return {
    from: filters.from ?? '',
    to: filters.to ?? '',
    paymentCount: toNumber(report?.payment_count),
    refundCount: toNumber(report?.refund_count),
    byCurrency,
    byType,
    byMethod,
    recentRefunds,
  }
}
