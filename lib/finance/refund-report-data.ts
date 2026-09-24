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

export async function getRefundManagementData(
  filters: {
    payment_q?: string
    refund_page?: string
  } = {},
) {
  await requirePermission(
    'finance.manage',
    '/admin/finance/refunds',
  )

  const paymentQuery = filters.payment_q?.trim() ?? ''
  const refundPage = Math.max(
    1,
    Number.parseInt(filters.refund_page ?? '1', 10) || 1,
  )
  const refundPageSize = 50
  const paymentLimit = 25
  const admin = createAdminClient()

  const { data, error } = await admin.rpc(
    'finance_refund_management_page',
    {
      p_payment_query: paymentQuery || null,
      p_refund_page: refundPage,
      p_refund_page_size: refundPageSize,
      p_payment_limit: paymentLimit,
    },
  )

  if (error) {
    console.error('refund management page', error)
    throw new Error('Unable to load refund management.')
  }

  type RefundManagementRpcRow = {
    eligible_payment_count: number | string
    eligible_payments: unknown
    refund_count: number | string
    refund_page: number | string
    refund_page_size: number | string
    refunds: unknown
  }

  const result =
    (data?.[0] ?? null) as RefundManagementRpcRow | null

  const eligiblePayments = Array.isArray(
    result?.eligible_payments,
  )
    ? result.eligible_payments.map((row) => {
        const item = row as Record<string, unknown>
        return {
          id: String(item.id ?? ''),
          payment_type: String(
            item.payment_type ?? '—',
          ),
          provider: String(item.provider ?? '—'),
          provider_transaction_id:
            typeof item.provider_transaction_id === 'string'
              ? item.provider_transaction_id
              : null,
          amount: item.amount,
          amount_number: toNumber(item.amount),
          currency: String(item.currency ?? 'SLE'),
          status: String(item.status ?? ''),
          payer_name:
            typeof item.payer_name === 'string'
              ? item.payer_name
              : null,
          payer_email:
            typeof item.payer_email === 'string'
              ? item.payer_email
              : null,
          payer_phone:
            typeof item.payer_phone === 'string'
              ? item.payer_phone
              : null,
          paid_at:
            typeof item.paid_at === 'string'
              ? item.paid_at
              : null,
          created_at: String(item.created_at ?? ''),
          order_number: String(
            item.order_number ?? '—',
          ),
          order_status:
            typeof item.order_status === 'string'
              ? item.order_status
              : null,
          payment_method: String(
            item.payment_method ?? 'unknown',
          ),
        }
      })
    : []

  const refunds = Array.isArray(result?.refunds)
    ? result.refunds.map((row) => {
        const item = row as Record<string, unknown>
        return {
          id: String(item.id ?? ''),
          payment_id: String(item.payment_id ?? ''),
          amount: item.amount,
          amount_number: toNumber(item.amount),
          reason: String(item.reason ?? ''),
          provider_refund_id:
            typeof item.provider_refund_id === 'string'
              ? item.provider_refund_id
              : null,
          status: String(item.status ?? ''),
          requested_by:
            typeof item.requested_by === 'string'
              ? item.requested_by
              : null,
          processed_at:
            typeof item.processed_at === 'string'
              ? item.processed_at
              : null,
          created_at: String(item.created_at ?? ''),
          refund_kind:
            typeof item.refund_kind === 'string'
              ? item.refund_kind
              : null,
          external_method:
            typeof item.external_method === 'string'
              ? item.external_method
              : null,
          notes:
            typeof item.notes === 'string'
              ? item.notes
              : null,
          completed_by:
            typeof item.completed_by === 'string'
              ? item.completed_by
              : null,
          provider_confirmed_at:
            typeof item.provider_confirmed_at === 'string'
              ? item.provider_confirmed_at
              : null,
          payment_type: String(
            item.payment_type ?? '—',
          ),
          provider: String(item.provider ?? '—'),
          currency: String(item.currency ?? 'SLE'),
          payer_name:
            typeof item.payer_name === 'string'
              ? item.payer_name
              : null,
          order_number: String(
            item.order_number ?? '—',
          ),
        }
      })
    : []

  const eligiblePaymentCount = toNumber(
    result?.eligible_payment_count,
  )
  const refundCount = toNumber(result?.refund_count)
  const returnedRefundPage = Math.max(
    1,
    toNumber(result?.refund_page) || refundPage,
  )
  const returnedRefundPageSize = Math.max(
    1,
    toNumber(result?.refund_page_size) ||
      refundPageSize,
  )
  const totalRefundPages = Math.max(
    1,
    Math.ceil(refundCount / returnedRefundPageSize),
  )

  return {
    paymentQuery,
    eligiblePayments,
    eligiblePaymentCount,
    refunds,
    refundCount,
    refundPage: returnedRefundPage,
    refundPageSize: returnedRefundPageSize,
    totalRefundPages,
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
            rawMethod === 'in-app' ||
            rawMethod === 'momo' ||
            rawMethod === 'card'
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
