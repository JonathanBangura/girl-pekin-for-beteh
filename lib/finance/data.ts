import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

type PaymentRow = {
  id: string
  payment_type: string
  vote_order_id: string | null
  ticket_order_id: string | null
  provider: string
  provider_transaction_id: string | null
  amount: number | string
  currency: string
  status: string
  payer_name: string | null
  payer_email: string | null
  payer_phone: string | null
  provider_payload: Record<string, unknown> | null
  failure_reason: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function paymentMethod(payment: PaymentRow) {
  const payload = payment.provider_payload
  if (!payload || typeof payload !== 'object') return 'unknown'

  const value = payload.payment_method
  if (value === 'in-app' || value === 'momo' || value === 'card') {
    return value
  }

  return 'unknown'
}

async function getPaymentRows(limit = 500) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('payments')
    .select(
      'id,payment_type,vote_order_id,ticket_order_id,provider,provider_transaction_id,amount,currency,status,payer_name,payer_email,payer_phone,provider_payload,failure_reason,paid_at,created_at,updated_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('finance payments', error)
    throw new Error('Unable to load payments.')
  }

  return (data ?? []) as PaymentRow[]
}

async function enrichPayments(payments: PaymentRow[]) {
  const admin = createAdminClient()

  const voteOrderIds = [
    ...new Set(
      payments
        .map((payment) => payment.vote_order_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ]
  const ticketOrderIds = [
    ...new Set(
      payments
        .map((payment) => payment.ticket_order_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ]

  const voteResult = voteOrderIds.length
    ? await admin
        .from('vote_orders')
        .select('id,order_number,status,nominee_id')
        .in('id', voteOrderIds)
    : { data: [], error: null }

  const ticketResult = ticketOrderIds.length
    ? await admin
        .from('ticket_orders')
        .select(
          'id,order_number,status,event_id,delivery_status,delivery_last_error',
        )
        .in('id', ticketOrderIds)
    : { data: [], error: null }

  if (voteResult.error) {
    console.error('finance vote order enrichment', voteResult.error)
  }

  if (ticketResult.error) {
    console.error('finance ticket order enrichment', ticketResult.error)
  }

  const voteMap = new Map(
    (voteResult.data ?? []).map((order) => [order.id, order]),
  )
  const ticketMap = new Map(
    (ticketResult.data ?? []).map((order) => [order.id, order]),
  )

  return payments.map((payment) => {
    const voteOrder = payment.vote_order_id
      ? voteMap.get(payment.vote_order_id)
      : null
    const ticketOrder = payment.ticket_order_id
      ? ticketMap.get(payment.ticket_order_id)
      : null

    return {
      ...payment,
      amount_number: toNumber(payment.amount),
      payment_method: paymentMethod(payment),
      order_number:
        voteOrder?.order_number ??
        ticketOrder?.order_number ??
        '—',
      order_status:
        voteOrder?.status ??
        ticketOrder?.status ??
        null,
      delivery_status:
        ticketOrder?.delivery_status ?? null,
      delivery_last_error:
        ticketOrder?.delivery_last_error ?? null,
    }
  })
}

export async function getFinanceOverviewData() {
  await requirePermission('finance.manage', '/admin/finance')

  const admin = createAdminClient()
  const [summaryResult, recentPayments] = await Promise.all([
    admin.rpc('finance_overview_summary'),
    getPaymentRows(12),
  ])

  if (summaryResult.error) {
    console.error('finance overview summary', summaryResult.error)
    throw new Error('Unable to load finance overview.')
  }

  type SummaryRow = {
    succeeded_count: number | string
    pending_count: number | string
    failed_count: number | string
    stale_payment_count: number | string
    unresolved_event_count: number | string
    refund_count: number | string
    volume_by_currency: unknown
    method_breakdown: unknown
  }

  const summary = (summaryResult.data?.[0] ?? null) as SummaryRow | null
  const enriched = await enrichPayments(recentPayments)

  const volumeByCurrency = Array.isArray(summary?.volume_by_currency)
    ? summary.volume_by_currency.map((row) => {
        const item = row as Record<string, unknown>
        return {
          currency: String(item.currency ?? 'SLE'),
          amount: toNumber(item.amount),
        }
      })
    : []

  const methodBreakdown = Array.isArray(summary?.method_breakdown)
    ? summary.method_breakdown.map((row) => {
        const item = row as Record<string, unknown>
        const rawMethod = String(item.payment_method ?? 'unknown')
        const normalizedMethod =
          rawMethod === 'in-app' ||
          rawMethod === 'momo' ||
          rawMethod === 'card'
            ? rawMethod
            : 'unknown'

        return {
          payment_method: normalizedMethod,
          currency: String(item.currency ?? 'SLE'),
          count: toNumber(item.count),
          amount: toNumber(item.amount),
        }
      })
    : []

  return {
    succeededCount: toNumber(summary?.succeeded_count),
    pendingCount: toNumber(summary?.pending_count),
    failedCount: toNumber(summary?.failed_count),
    unresolvedEventCount: toNumber(summary?.unresolved_event_count),
    stalePaymentCount: toNumber(summary?.stale_payment_count),
    refundCount: toNumber(summary?.refund_count),
    volumeByCurrency,
    methodBreakdown,
    recentPayments: enriched,
  }
}

export async function getFinancePaymentsData(filters: {
  status?: string
  type?: string
  provider?: string
  method?: string
  q?: string
  page?: string
}) {
  await requirePermission(
    'finance.manage',
    '/admin/finance/payments',
  )

  const validStatuses = new Set([
    'pending',
    'processing',
    'succeeded',
    'failed',
    'cancelled',
    'refunded',
    'partially_refunded',
    'reversed',
  ])
  const validTypes = new Set(['vote', 'ticket', 'donation'])
  const validMethods = new Set(['in-app', 'momo', 'card', 'unknown'])

  const page = Math.max(
    1,
    Number.parseInt(filters.page ?? '1', 10) || 1,
  )
  const pageSize = 50
  const admin = createAdminClient()

  const status =
    filters.status && validStatuses.has(filters.status)
      ? filters.status
      : null
  const type =
    filters.type && validTypes.has(filters.type)
      ? filters.type
      : null
  const method =
    filters.method && validMethods.has(filters.method)
      ? filters.method
      : null
  const provider = filters.provider?.trim() || null
  const q = filters.q?.trim() || null

  const [paymentsResult, optionsResult] = await Promise.all([
    admin.rpc('finance_payments_page', {
      p_status: status,
      p_type: type,
      p_provider: provider,
      p_method: method,
      p_query: q,
      p_page: page,
      p_page_size: pageSize,
    }),
    admin.rpc('finance_payment_filter_options'),
  ])

  if (paymentsResult.error) {
    console.error('finance paginated payments', paymentsResult.error)
    throw new Error('Unable to load payments.')
  }

  if (optionsResult.error) {
    console.error('finance payment filter options', optionsResult.error)
    throw new Error('Unable to load payment filter options.')
  }

  type RpcPaymentRow = PaymentRow & {
    payment_method: string
    order_number: string
    order_status: string | null
    delivery_status: string | null
    delivery_last_error: string | null
    total_count: number | string
  }

  const rpcRows = (paymentsResult.data ?? []) as RpcPaymentRow[]
  const totalCount = toNumber(rpcRows[0]?.total_count)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const payments = rpcRows.map((payment) => ({
    ...payment,
    amount_number: toNumber(payment.amount),
    payment_method:
      payment.payment_method === 'in-app' ||
      payment.payment_method === 'momo' ||
      payment.payment_method === 'card'
        ? payment.payment_method
        : 'unknown',
  }))

  const rawProviders = (
    optionsResult.data?.[0] as { providers?: unknown } | undefined
  )?.providers
  const providers = Array.isArray(rawProviders)
    ? rawProviders.map((value) => String(value)).filter(Boolean)
    : []

  return {
    payments,
    providers,
    totalCount,
    page,
    pageSize,
    totalPages,
  }
}

export type ReconciliationCase = {
  key: string
  severity: 'critical' | 'warning'
  kind:
    | 'webhook'
    | 'vote_settlement'
    | 'ticket_settlement'
    | 'ticket_issuance'
    | 'ticket_delivery'
    | 'stale_payment'
  title: string
  detail: string
  payment_id: string | null
  payment_event_id: number | null
  order_number: string | null
  created_at: string
  can_reprocess_event: boolean
  can_repair_payment: boolean
}

export async function getFinanceReconciliationData(
  filters: {
    page?: string
  } = {},
) {
  await requirePermission(
    'finance.manage',
    '/admin/finance/reconciliation',
  )

  const page = Math.max(
    1,
    Number.parseInt(filters.page ?? '1', 10) || 1,
  )
  const pageSize = 50
  const admin = createAdminClient()

  const { data, error } = await admin.rpc(
    'finance_reconciliation_page',
    {
      p_page: page,
      p_page_size: pageSize,
    },
  )

  if (error) {
    console.error('finance reconciliation page', error)
    throw new Error('Unable to load reconciliation cases.')
  }

  type ReconciliationRpcRow = {
    critical_count: number | string
    warning_count: number | string
    total_count: number | string
    cases: unknown
  }

  const result =
    (data?.[0] ?? null) as ReconciliationRpcRow | null

  const rawCases = Array.isArray(result?.cases)
    ? result.cases
    : []

  const cases: ReconciliationCase[] = rawCases.map((row) => {
    const item = row as Record<string, unknown>
    const severity =
      item.severity === 'critical' ? 'critical' : 'warning'

    const rawKind = String(item.kind ?? '')
    const validKinds = new Set<ReconciliationCase['kind']>([
      'webhook',
      'vote_settlement',
      'ticket_settlement',
      'ticket_issuance',
      'ticket_delivery',
      'stale_payment',
    ])

    const kind = validKinds.has(
      rawKind as ReconciliationCase['kind'],
    )
      ? (rawKind as ReconciliationCase['kind'])
      : 'stale_payment'

    const rawEventId = item.payment_event_id
    const paymentEventId =
      typeof rawEventId === 'number'
        ? rawEventId
        : rawEventId != null &&
            Number.isFinite(Number(rawEventId))
          ? Number(rawEventId)
          : null

    return {
      key: String(item.key ?? ''),
      severity,
      kind,
      title: String(item.title ?? ''),
      detail: String(item.detail ?? ''),
      payment_id:
        typeof item.payment_id === 'string'
          ? item.payment_id
          : null,
      payment_event_id: paymentEventId,
      order_number:
        typeof item.order_number === 'string'
          ? item.order_number
          : null,
      created_at: String(item.created_at ?? ''),
      can_reprocess_event: item.can_reprocess_event === true,
      can_repair_payment: item.can_repair_payment === true,
    }
  })

  const criticalCount = toNumber(result?.critical_count)
  const warningCount = toNumber(result?.warning_count)
  const totalCount = toNumber(result?.total_count)
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / pageSize),
  )

  return {
    cases,
    criticalCount,
    warningCount,
    totalCount,
    page,
    pageSize,
    totalPages,
  }
}
