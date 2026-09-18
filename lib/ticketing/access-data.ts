import { createPublicClient } from '@/lib/supabase/public'

function numberOrNull(
  value: unknown,
) {
  if (value == null) {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : null
}

export async function getFreeRegistrationOffer(
  slug: string,
) {
  const supabase =
    createPublicClient()

  const { data: event } =
    await supabase
      .from('events')
      .select(
        'id,slug,title,summary,venue,starts_at,status,is_public,access_type,capacity',
      )
      .eq('slug', slug)
      .maybeSingle()

  if (
    !event ||
    event.status !== 'published' ||
    event.is_public !== true ||
    event.access_type !==
      'free_registration'
  ) {
    return null
  }

  const { data: ticketTypes } =
    await supabase
      .from('ticket_types')
      .select(
        'id,event_id,name,description,pricing_type,currency,capacity,max_per_order,admissions_per_unit,sales_starts_at,sales_ends_at,is_active,sort_order',
      )
      .eq('event_id', event.id)
      .eq(
        'pricing_type',
        'free',
      )
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
      })
      .order('name', {
        ascending: true,
      })

  const now = Date.now()

  const availableTypes = (
    ticketTypes ?? []
  ).filter((type) => {
    const starts =
      type.sales_starts_at
        ? new Date(
            type.sales_starts_at,
          ).getTime()
        : null
    const ends =
      type.sales_ends_at
        ? new Date(
            type.sales_ends_at,
          ).getTime()
        : null

    return (
      (starts === null ||
        now >= starts) &&
      (ends === null ||
        now <= ends)
    )
  })

  return {
    event,
    ticketTypes:
      availableTypes.map(
        (type) => ({
          ...type,
          capacity:
            numberOrNull(
              type.capacity,
            ),
          max_per_order:
            numberOrNull(
              type.max_per_order,
            ),
          admissions_per_unit:
            Number(
              type.admissions_per_unit,
            ),
        }),
      ),
  }
}

export async function getInvitationOffer(
  token: string,
) {
  const supabase =
    createPublicClient()

  const { data, error } =
    await supabase.rpc(
      'get_public_event_invitation',
      {
        p_invite_token: token,
      },
    )

  if (
    error ||
    !data?.length
  ) {
    return null
  }

  return data[0]
}
