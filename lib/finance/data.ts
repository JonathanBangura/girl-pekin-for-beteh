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

function isOlderThan(value: string, minutes: number) {
  return (
    Date.now() - new Date(value).getTime() >
    minutes * 60 * 1000
  )
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
        const paymentMethod =
          rawMethod === 'in-app' || rawMethod === 'momo' || rawMethod === 'card'
            ? rawMethod
            : 'unknown'

        return {
          payment_method: paymentMethod,
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

export async function getFinanceReconciliationData() {
  await requirePermission(
    'finance.manage',
    '/admin/finance/reconciliation',
  )

  const admin = createAdminClient()

  const [
    payments,
    eventsResult,
    voteOrdersResult,
    ticketOrdersResult,
    orderItemsResult,
    ledgerResult,
    ticketsResult,
  ] = await Promise.all([
    getPaymentRows(1000),
    admin
      .from('payment_events')
      .select(
        'id,provider,provider_event_id,payment_id,event_type,processed_at,processing_error,received_at,payload',
      )
      .order('received_at', { ascending: false })
      .limit(1000),
    admin.from('vote_orders').select('id,order_number,status'),
    admin
      .from('ticket_orders')
      .select(
        'id,order_number,status,delivery_status,delivery_last_error',
      ),
    admin
      .from('ticket_order_items')
      .select(
        'id,ticket_order_id,quantity,admissions_per_unit',
      ),
    admin.from('vote_ledger').select('payment_id,source_key'),
    admin.from('tickets').select('id,ticket_order_id,status'),
  ])

  for (const [label, result] of [
    ['payment events', eventsResult],
    ['vote orders', voteOrdersResult],
    ['ticket orders', ticketOrdersResult],
    ['ticket order items', orderItemsResult],
    ['vote ledger', ledgerResult],
    ['tickets', ticketsResult],
  ] as const) {
    if (result.error) {
      console.error(`finance reconciliation ${label}`, result.error)
      throw new Error(
        `Unable to load ${label} for reconciliation.`,
      )
    }
  }

  const events = eventsResult.data ?? []
  const voteOrders = voteOrdersResult.data ?? []
  const ticketOrders = ticketOrdersResult.data ?? []
  const orderItems = orderItemsResult.data ?? []
  const ledger = ledgerResult.data ?? []
  const tickets = ticketsResult.data ?? []

  const paymentMap = new Map(
    payments.map((payment) => [payment.id, payment]),
  )
  const voteOrderMap = new Map(
    voteOrders.map((order) => [order.id, order]),
  )
  const ticketOrderMap = new Map(
    ticketOrders.map((order) => [order.id, order]),
  )
  const ledgerPaymentIds = new Set(
    ledger
      .map((entry) => entry.payment_id)
      .filter((value): value is string => Boolean(value)),
  )

  const expectedTickets = new Map<string, number>()
  for (const item of orderItems) {
    expectedTickets.set(
      item.ticket_order_id,
      (expectedTickets.get(item.ticket_order_id) ?? 0) +
        item.quantity * item.admissions_per_unit,
    )
  }

  const issuedTickets = new Map<string, number>()
  for (const ticket of tickets) {
    issuedTickets.set(
      ticket.ticket_order_id,
      (issuedTickets.get(ticket.ticket_order_id) ?? 0) + 1,
    )
  }

  const cases: ReconciliationCase[] = []

  for (const event of events) {
    if (
      event.event_type === 'completed' &&
      (!event.processed_at || event.processing_error)
    ) {
      const payment = event.payment_id
        ? paymentMap.get(event.payment_id)
        : null

      const order =
        payment?.vote_order_id
          ? voteOrderMap.get(payment.vote_order_id)
          : payment?.ticket_order_id
            ? ticketOrderMap.get(payment.ticket_order_id)
            : null

      cases.push({
        key: `event:${event.id}`,
        severity: 'critical',
        kind: 'webhook',
        title: 'Completed Vult webhook needs reprocessing',
        detail:
          event.processing_error ||
          'Provider completion was received but the event was not marked processed.',
        payment_id: event.payment_id ?? null,
        payment_event_id: event.id,
        order_number: order?.order_number ?? null,
        created_at: event.received_at,
        can_reprocess_event: Boolean(event.payment_id),
        can_repair_payment: false,
      })
    }
  }

  for (const payment of payments) {
    if (payment.status === 'succeeded') {
      if (
        payment.payment_type === 'vote' &&
        payment.vote_order_id
      ) {
        const order = voteOrderMap.get(payment.vote_order_id)

        if (
          order?.status !== 'paid' ||
          !ledgerPaymentIds.has(payment.id)
        ) {
          cases.push({
            key: `vote:${payment.id}`,
            severity: 'critical',
            kind: 'vote_settlement',
            title: 'Successful vote payment is not fully settled',
            detail:
              order?.status !== 'paid'
                ? 'The payment succeeded but the vote order is not marked paid.'
                : 'The payment succeeded but its vote-ledger entry is missing.',
            payment_id: payment.id,
            payment_event_id: null,
            order_number: order?.order_number ?? null,
            created_at: payment.paid_at ?? payment.created_at,
            can_reprocess_event: false,
            can_repair_payment: true,
          })
        }
      }

      if (
        payment.payment_type === 'ticket' &&
        payment.ticket_order_id
      ) {
        const order = ticketOrderMap.get(
          payment.ticket_order_id,
        )

        if (order?.status !== 'paid') {
          cases.push({
            key: `ticket-settlement:${payment.id}`,
            severity: 'critical',
            kind: 'ticket_settlement',
            title: 'Successful ticket payment is not fully settled',
            detail:
              'The payment succeeded but the ticket order is not marked paid.',
            payment_id: payment.id,
            payment_event_id: null,
            order_number: order?.order_number ?? null,
            created_at: payment.paid_at ?? payment.created_at,
            can_reprocess_event: false,
            can_repair_payment: true,
          })
        }

        const expected =
          expectedTickets.get(payment.ticket_order_id) ?? 0
        const issued =
          issuedTickets.get(payment.ticket_order_id) ?? 0

        if (
          order?.status === 'paid' &&
          expected > 0 &&
          expected !== issued
        ) {
          cases.push({
            key: `ticket-issuance:${payment.id}`,
            severity: 'critical',
            kind: 'ticket_issuance',
            title: 'Paid ticket order has an issuance mismatch',
            detail: `Expected ${expected} individual ticket(s), but ${issued} were issued.`,
            payment_id: payment.id,
            payment_event_id: null,
            order_number: order?.order_number ?? null,
            created_at: payment.paid_at ?? payment.created_at,
            can_reprocess_event: false,
            can_repair_payment: true,
          })
        }

        if (order?.delivery_status === 'failed') {
          cases.push({
            key: `ticket-delivery:${payment.id}`,
            severity: 'warning',
            kind: 'ticket_delivery',
            title: 'Ticket email delivery failed',
            detail:
              order.delivery_last_error ||
              'The paid order is valid but its email delivery failed.',
            payment_id: payment.id,
            payment_event_id: null,
            order_number: order.order_number,
            created_at: payment.paid_at ?? payment.created_at,
            can_reprocess_event: false,
            can_repair_payment: true,
          })
        }
      }
    }

    if (
      ['pending', 'processing'].includes(payment.status) &&
      isOlderThan(payment.created_at, 30)
    ) {
      const order =
        payment.vote_order_id
          ? voteOrderMap.get(payment.vote_order_id)
          : payment.ticket_order_id
            ? ticketOrderMap.get(payment.ticket_order_id)
            : null

      cases.push({
        key: `stale:${payment.id}`,
        severity: 'warning',
        kind: 'stale_payment',
        title: 'Payment has been pending for more than 30 minutes',
        detail:
          payment.failure_reason ||
          'No confirmed successful settlement has been recorded. Review before taking any manual action.',
        payment_id: payment.id,
        payment_event_id: null,
        order_number: order?.order_number ?? null,
        created_at: payment.created_at,
        can_reprocess_event: false,
        can_repair_payment: false,
      })
    }
  }

  cases.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1
    }

    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    )
  })

  return {
    cases,
    criticalCount: cases.filter(
      (item) => item.severity === 'critical',
    ).length,
    warningCount: cases.filter(
      (item) => item.severity === 'warning',
    ).length,
  }
}
