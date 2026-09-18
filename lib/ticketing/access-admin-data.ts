import { requireAnyAssignedPermission } from '@/lib/auth/guards'

export async function getEventAccessAdminData(
  requestedEventId?: string,
) {
  const { supabase } =
    await requireAnyAssignedPermission(
      'events.manage',
      '/admin/events/access',
    )

  const { data: events, error } =
    await supabase
      .from('events')
      .select(
        'id,title,slug,access_type,status,starts_at,venue',
      )
      .order('starts_at', {
        ascending: false,
      })

  if (error) {
    console.error(
      'event access events',
      error,
    )
    throw new Error(
      'Unable to load event access.',
    )
  }

  const eventRows =
    events ?? []

  const selectedEvent =
    eventRows.find(
      (event) =>
        event.id ===
        requestedEventId,
    ) ??
    eventRows[0] ??
    null

  if (!selectedEvent) {
    return {
      events: eventRows,
      selectedEvent: null,
      ticketTypes: [],
      invitations: [],
      counts: {
        confirmed: 0,
        free: 0,
        invitation: 0,
        complimentary: 0,
      },
    }
  }

  const [
    { data: ticketTypes },
    {
      data: invitations,
      error: invitationError,
    },
    {
      data: confirmedOrders,
      error: orderError,
    },
  ] = await Promise.all([
    supabase
      .from('ticket_types')
      .select(
        'id,event_id,name,pricing_type,is_active,admissions_per_unit,max_per_order',
      )
      .eq(
        'event_id',
        selectedEvent.id,
      )
      .order('sort_order', {
        ascending: true,
      }),
    supabase
      .from(
        'event_invitations',
      )
      .select(
        'id,event_id,ticket_type_id,invite_token,invitee_name,invitee_email,invitee_phone,quantity,status,expires_at,note,claimed_order_id,created_at',
      )
      .eq(
        'event_id',
        selectedEvent.id,
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(100),
    supabase
      .from('ticket_orders')
      .select(
        'id,source_type,status',
      )
      .eq(
        'event_id',
        selectedEvent.id,
      )
      .eq('status', 'confirmed')
      .in('source_type', [
        'free_registration',
        'invitation',
        'complimentary',
      ]),
  ])

  if (
    invitationError ||
    orderError
  ) {
    console.error(
      'event access related data',
      {
        invitationError,
        orderError,
      },
    )
    throw new Error(
      'Unable to load event access records.',
    )
  }

  const orders =
    confirmedOrders ?? []

  return {
    events: eventRows,
    selectedEvent,
    ticketTypes:
      ticketTypes ?? [],
    invitations:
      invitations ?? [],
    counts: {
      confirmed:
        orders.length,
      free: orders.filter(
        (order) =>
          order.source_type ===
          'free_registration',
      ).length,
      invitation:
        orders.filter(
          (order) =>
            order.source_type ===
            'invitation',
        ).length,
      complimentary:
        orders.filter(
          (order) =>
            order.source_type ===
            'complimentary',
        ).length,
    },
  }
}
