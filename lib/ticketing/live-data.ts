import { createPublicClient } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getPublicEvents() {
  const supabase = createPublicClient()

  const { data } = await supabase
    .from('events')
    .select(
      'id,award_edition_id,slug,title,summary,venue,starts_at,ends_at,access_type,status,capacity,cover_image_url',
    )
    .order('starts_at', { ascending: true })

  return data ?? []
}

export async function getPublicEventBySlug(slug: string) {
  const supabase = createPublicClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      'id,award_edition_id,slug,title,summary,description,venue,starts_at,ends_at,access_type,status,capacity,cover_image_url',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!event) return null

  const { data: ticketTypes } = await supabase
    .from('ticket_types')
    .select(
      'id,event_id,name,description,pricing_type,price,min_donation,currency,capacity,sales_starts_at,sales_ends_at,max_per_order,admissions_per_unit,is_active,sort_order',
    )
    .eq('event_id', event.id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return {
    event,
    ticketTypes: (ticketTypes ?? []).map((type) => ({
      ...type,
      price: type.price == null ? null : toNumber(type.price),
      min_donation:
        type.min_donation == null ? null : toNumber(type.min_donation),
    })),
  }
}

export async function getPublicTicketCheckoutOffer({
  slug,
  ticketTypeId,
}: {
  slug: string
  ticketTypeId: string
}) {
  const data = await getPublicEventBySlug(slug)
  if (!data) return null

  const ticketType = data.ticketTypes.find((type) => type.id === ticketTypeId)
  if (!ticketType) return null

  const now = Date.now()
  const starts = ticketType.sales_starts_at
    ? new Date(ticketType.sales_starts_at).getTime()
    : null
  const ends = ticketType.sales_ends_at
    ? new Date(ticketType.sales_ends_at).getTime()
    : null

  const salesOpen =
    data.event.status === 'published' &&
    data.event.access_type === 'paid' &&
    ticketType.is_active === true &&
    (starts === null || now >= starts) &&
    (ends === null || now <= ends)

  return {
    ...data,
    ticketType,
    salesOpen,
  }
}

export async function getPublicTicketOrderStatus(token: string) {
  const supabase = createPublicClient()

  const { data, error } = await supabase.rpc(
    'get_public_ticket_order_status',
    { p_public_token: token },
  )

  if (error || !data?.length) return null
  return data[0]
}

export async function getAdminEventsData() {
  const supabase = await createClient()

  const [
    { data: events },
    { data: ticketTypes },
    { count: ticketOrders },
    { count: paidOrders },
    { count: pendingOrders },
    { count: activeTickets },
  ] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id,award_edition_id,slug,title,venue,starts_at,access_type,status,is_public,capacity,updated_at',
      )
      .order('starts_at', { ascending: false }),
    supabase
      .from('ticket_types')
      .select(
        'id,event_id,name,pricing_type,price,min_donation,currency,capacity,sales_starts_at,sales_ends_at,max_per_order,admissions_per_unit,is_active,sort_order',
      )
      .order('sort_order', { ascending: true }),
    supabase
      .from('ticket_orders')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('ticket_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid'),
    supabase
      .from('ticket_orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'payment_pending']),
    supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ])

  const typeCounts = new Map<string, number>()
  for (const type of ticketTypes ?? []) {
    typeCounts.set(type.event_id, (typeCounts.get(type.event_id) ?? 0) + 1)
  }

  return {
    events: (events ?? []).map((event) => ({
      ...event,
      ticket_type_count: typeCounts.get(event.id) ?? 0,
    })),
    ticketTypes: ticketTypes ?? [],
    counts: {
      ticketOrders: ticketOrders ?? 0,
      paidOrders: paidOrders ?? 0,
      pendingOrders: pendingOrders ?? 0,
      activeTickets: activeTickets ?? 0,
    },
  }
}

export async function getAdminTicketOrdersData() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('ticket_orders')
    .select(
      'id,order_number,event_id,purchaser_name,purchaser_email,purchaser_phone,total_amount,currency,status,created_at,expires_at',
    )
    .order('created_at', { ascending: false })
    .limit(50)

  const orderIds = (orders ?? []).map((order) => order.id)
  const eventIds = [...new Set((orders ?? []).map((order) => order.event_id))]

  const [{ data: items }, { data: events }, { data: payments }] =
    await Promise.all([
      orderIds.length
        ? supabase
            .from('ticket_order_items')
            .select(
              'ticket_order_id,ticket_type_name,quantity,admissions_per_unit,unit_amount,line_total',
            )
            .in('ticket_order_id', orderIds)
        : Promise.resolve({ data: [] }),
      eventIds.length
        ? supabase
            .from('events')
            .select('id,title,slug')
            .in('id', eventIds)
        : Promise.resolve({ data: [] }),
      orderIds.length
        ? supabase
            .from('payments')
            .select('ticket_order_id,status,provider_transaction_id,created_at')
            .in('ticket_order_id', orderIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

  const itemMap = new Map(
    (items ?? []).map((item) => [item.ticket_order_id, item]),
  )
  const eventMap = new Map(
    (events ?? []).map((event) => [event.id, event]),
  )
  const paymentMap = new Map<string, any>()

  for (const payment of payments ?? []) {
    if (payment.ticket_order_id && !paymentMap.has(payment.ticket_order_id)) {
      paymentMap.set(payment.ticket_order_id, payment)
    }
  }

  return (orders ?? []).map((order) => ({
    ...order,
    item: itemMap.get(order.id) ?? null,
    event: eventMap.get(order.event_id) ?? null,
    payment: paymentMap.get(order.id) ?? null,
  }))
}
