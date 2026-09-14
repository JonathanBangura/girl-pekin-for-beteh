import { createClient } from '@/lib/supabase/server'

const ticketStatuses = new Set([
  'active',
  'cancelled',
  'refunded',
  'reissued',
])

export async function getAdminTicketsData({
  eventId,
  status,
}: {
  eventId?: string
  status?: string
}) {
  const supabase = await createClient()

  const { data: events, error: eventsError } =
    await supabase
      .from('events')
      .select('id,title,slug,starts_at,status')
      .order('starts_at', { ascending: false })

  if (eventsError) {
    console.error('getAdminTicketsData events', eventsError)
    throw new Error('Unable to load event access.')
  }

  let ticketsQuery = supabase
    .from('tickets')
    .select(
      'id,ticket_order_id,ticket_order_item_id,event_id,ticket_type_id,ticket_code,status,holder_name,admission_sequence,reissued_from_ticket_id,issued_at,cancelled_at,updated_at',
    )
    .order('issued_at', { ascending: false })
    .limit(200)

  if (eventId) {
    ticketsQuery = ticketsQuery.eq('event_id', eventId)
  }

  if (status && ticketStatuses.has(status)) {
    ticketsQuery = ticketsQuery.eq('status', status)
  }

  const { data: tickets, error: ticketsError } =
    await ticketsQuery

  if (ticketsError) {
    console.error('getAdminTicketsData tickets', ticketsError)
    throw new Error('Unable to load tickets.')
  }

  const ticketRows = tickets ?? []
  const orderIds = [
    ...new Set(ticketRows.map((ticket) => ticket.ticket_order_id)),
  ]
  const itemIds = [
    ...new Set(
      ticketRows.map((ticket) => ticket.ticket_order_item_id),
    ),
  ]
  const ticketIds = ticketRows.map((ticket) => ticket.id)

  const [
    { data: orders, error: ordersError },
    { data: items, error: itemsError },
    { data: checkins, error: checkinsError },
  ] = await Promise.all([
    orderIds.length
      ? supabase
          .from('ticket_orders')
          .select('id,order_number,status')
          .in('id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? supabase
          .from('ticket_order_items')
          .select('id,ticket_type_name,pricing_type')
          .in('id', itemIds)
      : Promise.resolve({ data: [], error: null }),
    ticketIds.length
      ? supabase
          .from('ticket_checkins')
          .select(
            'ticket_id,checked_in_at,device_label',
          )
          .in('ticket_id', ticketIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (ordersError || itemsError || checkinsError) {
    console.error('getAdminTicketsData related records', {
      ordersError,
      itemsError,
      checkinsError,
    })
    throw new Error(
      'Unable to load complete ticket details.',
    )
  }

  const eventMap = new Map(
    (events ?? []).map((event) => [event.id, event]),
  )
  const orderMap = new Map(
    (orders ?? []).map((order) => [order.id, order]),
  )
  const itemMap = new Map(
    (items ?? []).map((item) => [item.id, item]),
  )
  const checkinMap = new Map(
    (checkins ?? []).map((checkin) => [
      checkin.ticket_id,
      checkin,
    ]),
  )

  const makeTicketCount = (ticketStatus?: string) => {
    let query = supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (ticketStatus) {
      query = query.eq('status', ticketStatus)
    }

    return query
  }

  let checkinCountQuery = supabase
    .from('ticket_checkins')
    .select('id', { count: 'exact', head: true })

  if (eventId) {
    checkinCountQuery = checkinCountQuery.eq(
      'event_id',
      eventId,
    )
  }

  const [
    totalCount,
    activeCount,
    cancelledCount,
    refundedCount,
    reissuedCount,
    checkinCount,
  ] = await Promise.all([
    makeTicketCount(),
    makeTicketCount('active'),
    makeTicketCount('cancelled'),
    makeTicketCount('refunded'),
    makeTicketCount('reissued'),
    checkinCountQuery,
  ])

  return {
    events: events ?? [],
    selectedEventId: eventId ?? '',
    selectedStatus:
      status && ticketStatuses.has(status) ? status : '',
    tickets: ticketRows.map((ticket) => ({
      ...ticket,
      event: eventMap.get(ticket.event_id) ?? null,
      order:
        orderMap.get(ticket.ticket_order_id) ?? null,
      item:
        itemMap.get(ticket.ticket_order_item_id) ??
        null,
      checkin: checkinMap.get(ticket.id) ?? null,
    })),
    counts: {
      total: totalCount.count ?? 0,
      active: activeCount.count ?? 0,
      cancelled: cancelledCount.count ?? 0,
      refunded: refundedCount.count ?? 0,
      reissued: reissuedCount.count ?? 0,
      checkedIn: checkinCount.count ?? 0,
    },
  }
}
