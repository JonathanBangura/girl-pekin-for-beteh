import { requireAuthenticated } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type EventRow = {
  id: string
  title: string
  slug: string
  venue: string | null
  starts_at: string | null
  status: string
}

export async function getScannerBootstrapData() {
  await requireAuthenticated('/scan')

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: events, error } = await admin
    .from('events')
    .select('id,title,slug,venue,starts_at,status')
    .in('status', ['published', 'sales_closed'])
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('getScannerBootstrapData events', error)
    throw new Error('Unable to load check-in events.')
  }

  const allowedEvents: EventRow[] = []
  let canViewAdminCheckins = false

  for (const event of events ?? []) {
    const [
      { data: canCheckIn },
      { data: canManageEvent },
    ] = await Promise.all([
      supabase.rpc('has_permission', {
        requested_permission_code: 'checkin.use',
        requested_scope_type: 'event',
        requested_scope_id: event.id,
      }),
      supabase.rpc('has_permission', {
        requested_permission_code: 'events.manage',
        requested_scope_type: 'event',
        requested_scope_id: event.id,
      }),
    ])

    if (canManageEvent === true) {
      canViewAdminCheckins = true
    }

    if (canCheckIn === true || canManageEvent === true) {
      allowedEvents.push(event)
    }
  }

  const initialEvent = allowedEvents[0] ?? null

  return {
    events: allowedEvents,
    canViewAdminCheckins,
    initialSummary: initialEvent
      ? await getCheckinSummary(initialEvent.id)
      : null,
  }
}

export async function getCheckinSummary(eventId: string) {
  const admin = createAdminClient()

  const [
    { count: issued },
    { count: active },
    { count: checkedIn },
    { data: recentCheckins },
  ] = await Promise.all([
    admin
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
    admin
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'active'),
    admin
      .from('ticket_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
    admin
      .from('ticket_checkins')
      .select('id,ticket_id,checked_in_at,device_label')
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false })
      .limit(8),
  ])

  const ticketIds = [
    ...new Set((recentCheckins ?? []).map((row) => row.ticket_id)),
  ]

  const { data: tickets } = ticketIds.length
    ? await admin
        .from('tickets')
        .select('id,ticket_code,holder_name,ticket_order_item_id')
        .in('id', ticketIds)
    : { data: [] }

  const itemIds = [
    ...new Set(
      (tickets ?? []).map((ticket) => ticket.ticket_order_item_id),
    ),
  ]

  const { data: items } = itemIds.length
    ? await admin
        .from('ticket_order_items')
        .select('id,ticket_type_name')
        .in('id', itemIds)
    : { data: [] }

  const ticketMap = new Map(
    (tickets ?? []).map((ticket) => [ticket.id, ticket]),
  )
  const itemMap = new Map(
    (items ?? []).map((item) => [item.id, item.ticket_type_name]),
  )

  return {
    issued: issued ?? 0,
    active: active ?? 0,
    checkedIn: checkedIn ?? 0,
    remaining: Math.max((active ?? 0) - (checkedIn ?? 0), 0),
    recent: (recentCheckins ?? []).map((row) => {
      const ticket = ticketMap.get(row.ticket_id)

      return {
        id: row.id,
        checked_in_at: row.checked_in_at,
        device_label: row.device_label,
        ticket_code: ticket?.ticket_code ?? '—',
        holder_name: ticket?.holder_name ?? null,
        ticket_type_name: ticket
          ? itemMap.get(ticket.ticket_order_item_id) ?? 'Event Ticket'
          : 'Event Ticket',
      }
    }),
  }
}

export async function getAdminCheckinsData(
  requestedEventId?: string,
) {
  await requireAuthenticated('/admin/events/checkins')

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: events, error } = await admin
    .from('events')
    .select('id,title,slug,venue,starts_at,status')
    .order('starts_at', { ascending: false })

  if (error) {
    console.error('getAdminCheckinsData events', error)
    throw new Error('Unable to load events.')
  }

  const allowedEvents: EventRow[] = []
  let canViewAdminCheckins = false

  for (const event of events ?? []) {
    const { data: canManage } = await supabase.rpc('has_permission', {
      requested_permission_code: 'events.manage',
      requested_scope_type: 'event',
      requested_scope_id: event.id,
    })

    if (canManage === true) {
      allowedEvents.push(event)
    }
  }

  const selectedEvent =
    allowedEvents.find((event) => event.id === requestedEventId) ??
    allowedEvents[0] ??
    null

  return {
    events: allowedEvents,
    selectedEvent,
    summary: selectedEvent
      ? await getCheckinSummary(selectedEvent.id)
      : null,
  }
}
