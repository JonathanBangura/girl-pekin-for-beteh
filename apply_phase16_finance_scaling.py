from pathlib import Path
import re

ROOT = Path.cwd()


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        raise SystemExit(f"Missing expected repository file: {path}")
    return target.read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    print(f"updated {path}")


def replace_between(text: str, start: str, end: str, replacement: str, path: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"Could not find start marker in {path}: {start!r}")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"Could not find end marker in {path}: {end!r}")
    return text[:start_index] + replacement + text[end_index:]


def replace_once(text: str, old: str, new: str, path: str) -> str:
    if old not in text:
        raise SystemExit(f"Could not find expected text in {path}: {old[:100]!r}")
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# lib/finance/data.ts
# -----------------------------------------------------------------------------
path = "lib/finance/data.ts"
text = read(path)

text, count = re.subn(
    r"function paymentMethod\(payment: PaymentRow\) \{.*?\n\}\n",
    """function paymentMethod(payment: PaymentRow) {
  const payload = payment.provider_payload
  if (!payload || typeof payload !== 'object') return 'unknown'

  const value = payload.payment_method
  if (value === 'in-app' || value === 'momo' || value === 'card') {
    return value
  }

  return 'unknown'
}
""",
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("Could not patch paymentMethod() in lib/finance/data.ts")

overview_replacement = r'''export async function getFinanceOverviewData() {
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

'''
text = replace_between(
    text,
    "export async function getFinanceOverviewData() {",
    "export async function getFinancePaymentsData(",
    overview_replacement,
    path,
)

payments_replacement = r'''export async function getFinancePaymentsData(filters: {
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

'''
text = replace_between(
    text,
    "export async function getFinancePaymentsData(",
    "export type ReconciliationCase",
    payments_replacement,
    path,
)
write(path, text)


# -----------------------------------------------------------------------------
# app/admin/finance/payments/page.tsx
# -----------------------------------------------------------------------------
write(
    "app/admin/finance/payments/page.tsx",
    """import { FinancePaymentsLivePage } from '@/components/portal/finance-live'\n\ntype PageProps = {\n  searchParams: Promise<{\n    status?: string\n    type?: string\n    provider?: string\n    method?: string\n    q?: string\n    page?: string\n  }>\n}\n\nexport default async function PaymentsPage({\n  searchParams,\n}: PageProps) {\n  const filters = await searchParams\n  return <FinancePaymentsLivePage filters={filters} />\n}\n""",
)


# -----------------------------------------------------------------------------
# components/portal/finance-live.tsx
# -----------------------------------------------------------------------------
path = "components/portal/finance-live.tsx"
text = read(path)

text = replace_once(
    text,
    "function StatusBadge({",
    """function paymentMethodLabel(value?: string | null) {\n  if (value === 'in-app') return 'Vult App'\n  if (value === 'momo') return 'Mobile Money'\n  if (value === 'card') return 'Card'\n  return 'Unknown'\n}\n\nfunction StatusBadge({""",
    path,
)
text = text.replace(
    "{paymentMethodLabel(payment.payment_method)}",
    "{paymentMethodLabel(payment.payment_method)}",
)

method_summary = r'''
      <section className="panel">
        <div className="v2-card-head">
          <div>
            <span className="v2-admin-eyebrow">
              Payment methods
            </span>
            <h2>Successful collections by method</h2>
          </div>
        </div>

        {data.methodBreakdown.length ? (
          <div className="v2-admin-stats mobile-admin-stats">
            {data.methodBreakdown.map((row) => (
              <article
                key={`${row.payment_method}:${row.currency}`}
              >
                <span>{paymentMethodLabel(row.payment_method)}</span>
                <strong>{money(row.amount, row.currency)}</strong>
                <small>
                  {row.count.toLocaleString()} successful payment(s) ·{' '}
                  {row.currency}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="live-empty-state compact">
            <strong>No successful payment-method activity yet.</strong>
          </div>
        )}
      </section>

'''
text = replace_once(
    text,
    "      {(data.unresolvedEventCount > 0 ||\n",
    method_summary + "      {(data.unresolvedEventCount > 0 ||\n",
    path,
)

href_helper = r'''function financePaymentsHref(
  filters: {
    status?: string
    type?: string
    provider?: string
    method?: string
    q?: string
    page?: string
  },
  page: number,
) {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.provider) params.set('provider', filters.provider)
  if (filters.method) params.set('method', filters.method)
  if (page > 1) params.set('page', String(page))

const query = params.toString()
  return query
    ? `/admin/finance/payments?${query}`
    : '/admin/finance/payments'
}
}

'''
text = replace_once(
    text,
    "export async function FinancePaymentsLivePage({",
    href_helper + "export async function FinancePaymentsLivePage({",
    path,
)

old_filters = """    status?: string\n    type?: string\n    provider?: string\n    q?: string\n  }"""
new_filters = """    status?: string\n    type?: string\n    provider?: string\n    method?: string\n    q?: string\n    page?: string\n  }"""
# This exact shape first appears on FinancePaymentsLivePage after the helper was inserted.
needle = "export async function FinancePaymentsLivePage({"
idx = text.find(needle)
if idx < 0:
    raise SystemExit("Could not find FinancePaymentsLivePage")
prefix, suffix = text[:idx], text[idx:]
if old_filters not in suffix:
    raise SystemExit("Could not patch FinancePaymentsLivePage filters")
suffix = suffix.replace(old_filters, new_filters, 1)
text = prefix + suffix

provider_label = """        <label>\n          Provider\n          <select"""
method_filter = """        <label>\n          Payment method\n          <select\n            name=\"method\"\n            defaultValue={filters.method ?? ''}\n          >\n            <option value=\"\">All methods</option>\n            <option value=\"in-app\">Vult App</option>\n            <option value=\"momo\">Mobile Money</option>\n            <option value=\"card\">Card</option>\n            <option value=\"unknown\">Unknown</option>\n          </select>\n        </label>\n\n"""
text = replace_once(text, provider_label, method_filter + provider_label, path)
text = text.replace(
    "{data.totalCount} RESULTS",
    "{data.totalCount} RESULTS",
    1,
)

pagination_boundary = """        </div>\n      </section>\n    </div>\n  )\n}\n\nexport async function FinanceReconciliationLivePage"""
pagination = r'''        </div>

        {data.totalPages > 1 ? (
          <div className="v2-admin-page-actions">
            {data.page > 1 ? (
              <Link
                className="button secondary"
                href={financePaymentsHref(filters, data.page - 1)}
              >
                Previous
              </Link>
            ) : null}

            <span className="live-data-badge">
              PAGE {data.page} OF {data.totalPages}
            </span>

            {data.page < data.totalPages ? (
              <Link
                className="button secondary"
                href={financePaymentsHref(filters, data.page + 1)}
              >
                Next
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}

export async function FinanceReconciliationLivePage'''
text = replace_once(text, pagination_boundary, pagination, path)
write(path, text)


# -----------------------------------------------------------------------------
# lib/finance/refund-report-data.ts
# -----------------------------------------------------------------------------
path = "lib/finance/refund-report-data.ts"
text = read(path)
report_marker = "export async function getFinanceReportsData(filters: {"
marker_index = text.find(report_marker)
if marker_index < 0:
    raise SystemExit("Could not find getFinanceReportsData()")

report_replacement = r'''export async function getFinanceReportsData(filters: {
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
'''
text = text[:marker_index] + report_replacement
write(path, text)


# -----------------------------------------------------------------------------
# components/portal/finance-refunds-reports.tsx
# -----------------------------------------------------------------------------
path = "components/portal/finance-refunds-reports.tsx"
text = read(path)
text = replace_once(
    text,
    "function RefundNotice({",
    """function paymentMethodLabel(value?: string | null) {\n  if (value === 'in-app') return 'Vult App'\n  if (value === 'momo') return 'Mobile Money'\n  if (value === 'card') return 'Card'\n  return 'Unknown'\n}\n\nfunction RefundNotice({""",
    path,
)

exports_marker = """      <section className=\"panel\">\n        <div className=\"v2-card-head\">\n          <div>\n            <span className=\"v2-admin-eyebrow\">\n              Exports"""
method_report = r'''      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div>
            <h2>Collections by payment method</h2>
            <span className="live-data-badge">
              VULT APP · MOBILE MONEY · CARD
            </span>
          </div>
        </div>

        <div className="live-table-wrap mobile-table-wrap">
          <table className="live-admin-table">
            <thead>
              <tr>
                <th>Payment method</th>
                <th>Paid records</th>
                <th>Gross collected</th>
              </tr>
            </thead>
            <tbody>
              {data.byMethod.map((row) => (
                <tr
                  key={`${row.payment_method}:${row.currency}`}
                >
                  <td>
                    {paymentMethodLabel(row.payment_method)}
                  </td>
                  <td>{row.count}</td>
                  <td>{money(row.amount, row.currency)}</td>
                </tr>
              ))}

              {!data.byMethod.length && (
                <tr>
                  <td colSpan={3}>
                    <div className="live-empty-state compact">
                      <strong>No payment-method report rows.</strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

'''
text = replace_once(text, exports_marker, method_report + exports_marker, path)
write(path, text)


# -----------------------------------------------------------------------------
# app/api/admin/finance/export/route.ts
# -----------------------------------------------------------------------------
write(
    "app/api/admin/finance/export/route.ts",
    r'''import { NextResponse, type NextRequest } from 'next/server'
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

function paymentMethod(value: unknown) {
  if (!value || typeof value !== 'object') return 'unknown'
  const raw = (value as Record<string, unknown>).payment_method
  if (raw === 'in-app' || raw === 'momo' || raw === 'card') {
    return raw
  }
  return 'unknown'
}

function paymentMethodLabel(value: string) {
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

  const { data: allowed, error: permissionError } = await supabase.rpc(
    'has_permission',
    {
      requested_permission_code: 'finance.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    },
  )

  if (permissionError || allowed !== true) {
    return NextResponse.json(
      { error: 'Finance permission required.' },
      { status: 403 },
    )
  }

  const report = request.nextUrl.searchParams.get('report') ?? ''
  const from = dateStart(request.nextUrl.searchParams.get('from'))
  const to = dateEnd(request.nextUrl.searchParams.get('to'))

  const admin = createAdminClient()
  const pageSize = 1000
  let content = ''
  let filename = ''

  if (report === 'payments') {
    const rows: Array<{
      id: string
      payment_type: string
      provider: string
      provider_transaction_id: string | null
      amount: number | string
      currency: string
      status: string
      payer_name: string | null
      payer_email: string | null
      payer_phone: string | null
      paid_at: string | null
      created_at: string
      vote_order_id: string | null
      ticket_order_id: string | null
      provider_payload: Record<string, unknown> | null
    }> = []

    for (let offset = 0; ; offset += pageSize) {
      let query = admin
        .from('payments')
        .select(
          'id,payment_type,provider,provider_transaction_id,amount,currency,status,payer_name,payer_email,payer_phone,paid_at,created_at,vote_order_id,ticket_order_id,provider_payload',
        )
        .in('status', [
          'succeeded',
          'refunded',
          'partially_refunded',
          'reversed',
        ])
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

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

      const batch = data ?? []
      rows.push(...batch)
      if (batch.length < pageSize) break
    }

    content = csv([
      [
        'Payment ID',
        'Type',
        'Provider',
        'Payment Method',
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
      ...rows.map((row) => [
        row.id,
        row.payment_type,
        row.provider,
        paymentMethodLabel(paymentMethod(row.provider_payload)),
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
    const rows: Array<{
      id: string
      payment_id: string
      amount: number | string
      status: string
      refund_kind: string | null
      provider_refund_id: string | null
      external_method: string | null
      reason: string
      notes: string | null
      processed_at: string | null
      provider_confirmed_at: string | null
      created_at: string
    }> = []

    for (let offset = 0; ; offset += pageSize) {
      let query = admin
        .from('refunds')
        .select(
          'id,payment_id,amount,status,refund_kind,provider_refund_id,external_method,reason,notes,processed_at,provider_confirmed_at,created_at',
        )
        .eq('status', 'succeeded')
        .order('processed_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

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

      const batch = data ?? []
      rows.push(...batch)
      if (batch.length < pageSize) break
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
      ...rows.map((row) => [
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
''',
)

print("Phase 16 Finance Scaling 01 code patches applied successfully.")
print("Next: create/apply the Supabase migration, then run pnpm typecheck/build/test in the connected account.")
