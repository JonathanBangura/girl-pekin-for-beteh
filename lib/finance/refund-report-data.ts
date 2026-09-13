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

  let paymentQuery = admin
    .from('payments')
    .select(
      'id,payment_type,provider,amount,currency,status,paid_at,created_at',
    )
    .in('status', [
      'succeeded',
      'refunded',
      'partially_refunded',
      'reversed',
    ])
    .not('paid_at', 'is', null)
    .order('paid_at', { ascending: false })

  const from = isoDateStart(filters.from)
  const to = isoDateEnd(filters.to)

  if (from) paymentQuery = paymentQuery.gte('paid_at', from)
  if (to) paymentQuery = paymentQuery.lte('paid_at', to)

  let refundQuery = admin
    .from('refunds')
    .select(
      'id,payment_id,amount,status,refund_kind,processed_at,created_at',
    )
    .eq('status', 'succeeded')
    .order('processed_at', { ascending: false })

  if (from) refundQuery = refundQuery.gte('processed_at', from)
  if (to) refundQuery = refundQuery.lte('processed_at', to)

  const [
    { data: payments, error: paymentsError },
    { data: refunds, error: refundsError },
  ] = await Promise.all([paymentQuery, refundQuery])

  if (paymentsError) {
    console.error('finance reports payments', paymentsError)
    throw new Error('Unable to load report payments.')
  }

  if (refundsError) {
    console.error('finance reports refunds', refundsError)
    throw new Error('Unable to load report refunds.')
  }

  const paymentMap = new Map(
    (payments ?? []).map((payment) => [
      payment.id,
      payment,
    ]),
  )

  const byCurrency = new Map<
    string,
    { gross: number; refunds: number; net: number }
  >()

  const byType = new Map<
    string,
    {
      payment_type: string
      currency: string
      count: number
      amount: number
    }
  >()

  for (const payment of payments ?? []) {
    const currency = payment.currency
    const amount = toNumber(payment.amount)

    const current =
      byCurrency.get(currency) ??
      { gross: 0, refunds: 0, net: 0 }

    current.gross += amount
    current.net += amount
    byCurrency.set(currency, current)

    const typeKey =
      `${payment.payment_type}:${payment.currency}`
    const type =
      byType.get(typeKey) ?? {
        payment_type: payment.payment_type,
        currency: payment.currency,
        count: 0,
        amount: 0,
      }

    type.count += 1
    type.amount += amount
    byType.set(typeKey, type)
  }

  for (const refund of refunds ?? []) {
    const payment = paymentMap.get(refund.payment_id)
    if (!payment) continue

    const amount = toNumber(refund.amount)
    const current =
      byCurrency.get(payment.currency) ??
      { gross: 0, refunds: 0, net: 0 }

    current.refunds += amount
    current.net -= amount
    byCurrency.set(payment.currency, current)
  }

  return {
    from: filters.from ?? '',
    to: filters.to ?? '',
    paymentCount: (payments ?? []).length,
    refundCount: (refunds ?? []).length,
    byCurrency: [...byCurrency.entries()].map(
      ([currency, totals]) => ({
        currency,
        ...totals,
      }),
    ),
    byType: [...byType.values()],
    recentRefunds: (refunds ?? []).slice(0, 10).map((refund) => {
      const payment = paymentMap.get(refund.payment_id)

      return {
        ...refund,
        currency: payment?.currency ?? 'SLE',
        payment_type: payment?.payment_type ?? '—',
        provider: payment?.provider ?? '—',
      }
    }),
  }
}
