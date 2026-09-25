import { redirect } from 'next/navigation'
import { requireAuthenticated } from '@/lib/auth/guards'
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


export type EventSalesRow = {
  payment_id: string
  ticket_order_id: string
  order_number: string
  purchaser_name: string
  purchaser_email: string | null
  purchaser_phone: string | null
  ticket_types: string
  units: number
  admissions: number
  payment_method: string
  provider: string
  gross_amount: number
  currency: string
  payment_status: string
  order_status: string
  paid_at: string
  refund_amount: number
  current_net: number
  total_count: number | string
}

export type EventSalesFilters = {
  event_id?: string
  from?: string
  to?: string
  status?: string
  method?: string
  page?: string
}

export async function getEventSalesDashboardData(
  filters: EventSalesFilters,
) {
  const nextPath = '/admin/events/sales'
  const { supabase } = await requireAuthenticated(nextPath)

  const [
    accessibleEventsResult,
    eventsPermissionResult,
    financePermissionResult,
  ] = await Promise.all([
    supabase.rpc('event_sales_accessible_events'),
    supabase.rpc('has_any_permission', {
      requested_permission_code: 'events.manage',
    }),
    supabase.rpc('has_permission', {
      requested_permission_code: 'finance.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    }),
  ])

  if (
    eventsPermissionResult.data !== true &&
    financePermissionResult.data !== true
  ) {
    redirect('/unauthorized')
  }

  if (accessibleEventsResult.error) {
    console.error(
      'event sales accessible events',
      accessibleEventsResult.error,
    )
    throw new Error('Unable to load accessible events.')
  }

  type AccessibleEvent = {
    id: string
    title: string
    slug: string
    venue: string | null
    starts_at: string | null
    ends_at: string | null
    access_type: string
    status: string
    capacity: number | null
  }

  const events =
    (accessibleEventsResult.data ?? []) as AccessibleEvent[]

  const selectedEvent =
    events.find((event) => event.id === filters.event_id) ??
    events[0] ??
    null

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

  const status =
    filters.status && validStatuses.has(filters.status)
      ? filters.status
      : null
  const method =
    filters.method && validMethods.has(filters.method)
      ? filters.method
      : null
  const from = isoDateStart(filters.from)
  const to = isoDateEnd(filters.to)
  const page = Math.max(
    1,
    Number.parseInt(filters.page ?? '1', 10) || 1,
  )
  const pageSize = 50

  if (!selectedEvent) {
    return {
      events,
      selectedEvent: null,
      filters: {
        event_id: '',
        from: filters.from ?? '',
        to: filters.to ?? '',
        status: status ?? '',
        method: method ?? '',
      },
      paidOrderCount: 0,
      admissionsSold: 0,
      activeTickets: 0,
      checkinCount: 0,
      reservedAdmissions: 0,
      remainingCapacity: null as number | null,
      refundCount: 0,
      revenueByCurrency: [] as Array<{
        currency: string
        gross: number
        refunds: number
        net: number
      }>,
      methodBreakdown: [] as Array<{
        payment_method: string
        currency: string
        payment_count: number
        refund_count: number
        gross: number
        refunds: number
        net: number
      }>,
      ticketTypeBreakdown: [] as Array<{
        ticket_type_id: string
        ticket_type_name: string
        currency: string
        units: number
        admissions: number
        gross: number
      }>,
      accessBreakdown: [] as Array<{
        source_type: string
        admissions: number
      }>,
      sales: [] as EventSalesRow[],
      totalCount: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    }
  }

  const { data: eventAllowed, error: eventPermissionError } =
    await supabase.rpc('has_permission', {
      requested_permission_code: 'events.manage',
      requested_scope_type: 'event',
      requested_scope_id: selectedEvent.id,
    })

  if (
    eventPermissionError ||
    (
      eventAllowed !== true &&
      financePermissionResult.data !== true
    )
  ) {
    redirect('/unauthorized')
  }

  const admin = createAdminClient()

  const [summaryResult, pageResult] = await Promise.all([
    admin.rpc('event_sales_summary', {
      p_event_id: selectedEvent.id,
      p_from: from,
      p_to: to,
      p_status: status,
      p_method: method,
    }),
    admin.rpc('event_sales_page', {
      p_event_id: selectedEvent.id,
      p_from: from,
      p_to: to,
      p_status: status,
      p_method: method,
      p_page: page,
      p_page_size: pageSize,
    }),
  ])

  if (summaryResult.error) {
    console.error('event sales summary', summaryResult.error)
    throw new Error('Unable to load event sales summary.')
  }

  if (pageResult.error) {
    console.error('event sales page', pageResult.error)
    throw new Error('Unable to load event sales records.')
  }

  type SummaryRow = {
    paid_order_count: number | string
    admissions_sold: number | string
    active_tickets: number | string
    checkin_count: number | string
    reserved_admissions: number | string
    remaining_capacity: number | string | null
    refund_count: number | string
    revenue_by_currency: unknown
    method_breakdown: unknown
    ticket_type_breakdown: unknown
    access_breakdown: unknown
  }

  const summary =
    (summaryResult.data?.[0] ?? null) as SummaryRow | null

  const revenueByCurrency = Array.isArray(
    summary?.revenue_by_currency,
  )
    ? summary.revenue_by_currency.map((row) => {
        const item = row as Record<string, unknown>
        return {
          currency: String(item.currency ?? 'SLE'),
          gross: toNumber(item.gross),
          refunds: toNumber(item.refunds),
          net: toNumber(item.net),
        }
      })
    : []

  const methodBreakdown = Array.isArray(
    summary?.method_breakdown,
  )
    ? summary.method_breakdown.map((row) => {
        const item = row as Record<string, unknown>
        return {
          payment_method: String(
            item.payment_method ?? 'unknown',
          ),
          currency: String(item.currency ?? 'SLE'),
          payment_count: toNumber(item.payment_count),
          refund_count: toNumber(item.refund_count),
          gross: toNumber(item.gross),
          refunds: toNumber(item.refunds),
          net: toNumber(item.net),
        }
      })
    : []

  const ticketTypeBreakdown = Array.isArray(
    summary?.ticket_type_breakdown,
  )
    ? summary.ticket_type_breakdown.map((row) => {
        const item = row as Record<string, unknown>
        return {
          ticket_type_id: String(item.ticket_type_id ?? ''),
          ticket_type_name: String(
            item.ticket_type_name ?? 'Event Ticket',
          ),
          currency: String(item.currency ?? 'SLE'),
          units: toNumber(item.units),
          admissions: toNumber(item.admissions),
          gross: toNumber(item.gross),
        }
      })
    : []

  const accessBreakdown = Array.isArray(
    summary?.access_breakdown,
  )
    ? summary.access_breakdown.map((row) => {
        const item = row as Record<string, unknown>
        return {
          source_type: String(
            item.source_type ?? 'unknown',
          ),
          admissions: toNumber(item.admissions),
        }
      })
    : []

  type SalesRpcRow = {
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

  const rpcRows = (pageResult.data ?? []) as SalesRpcRow[]
  const totalCount = toNumber(rpcRows[0]?.total_count)
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / pageSize),
  )

  const sales: EventSalesRow[] = rpcRows.map((row) => ({
    ...row,
    units: toNumber(row.units),
    admissions: toNumber(row.admissions),
    gross_amount: toNumber(row.gross_amount),
    refund_amount: toNumber(row.refund_amount),
    current_net: toNumber(row.current_net),
  }))

  return {
    events,
    selectedEvent,
    filters: {
      event_id: selectedEvent.id,
      from: filters.from ?? '',
      to: filters.to ?? '',
      status: status ?? '',
      method: method ?? '',
    },
    paidOrderCount: toNumber(summary?.paid_order_count),
    admissionsSold: toNumber(summary?.admissions_sold),
    activeTickets: toNumber(summary?.active_tickets),
    checkinCount: toNumber(summary?.checkin_count),
    reservedAdmissions: toNumber(summary?.reserved_admissions),
    remainingCapacity:
      summary?.remaining_capacity == null
        ? null
        : toNumber(summary.remaining_capacity),
    refundCount: toNumber(summary?.refund_count),
    revenueByCurrency,
    methodBreakdown,
    ticketTypeBreakdown,
    accessBreakdown,
    sales,
    totalCount,
    page,
    pageSize,
    totalPages,
  }
}
