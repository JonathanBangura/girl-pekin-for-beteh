'use server'

import {
  randomBytes,
  randomUUID,
} from 'node:crypto'
import {
  revalidatePath,
} from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  hashTicketToken,
  makeTicketToken,
} from '@/lib/ticketing/ticket-security'
import { deliverTicketOrderEmail } from '@/lib/ticketing/ticket-email'

function text(
  formData: FormData,
  key: string,
) {
  return String(
    formData.get(key) ?? '',
  ).trim()
}

function shortYear(
  value?: string | null,
) {
  const date = value
    ? new Date(value)
    : new Date()

  return String(
    date.getUTCFullYear(),
  ).slice(-2)
}

function replacementCode(
  startsAt?: string | null,
) {
  return `TKT-${shortYear(
    startsAt,
  )}-${randomBytes(6)
    .toString('hex')
    .toUpperCase()}`
}

function returnUrl(
  eventId: string,
  params: Record<
    string,
    string
  >,
) {
  const search =
    new URLSearchParams({
      event_id: eventId,
      ...params,
    })

  return `/admin/events/tickets?${search.toString()}`
}

function refreshTickets(
  eventId: string,
) {
  revalidatePath(
    '/admin/events/tickets',
  )
  revalidatePath(
    '/admin/events/checkins',
  )
  revalidatePath('/scan')
  revalidatePath('/tickets')
  revalidatePath('/events')
  revalidatePath(
    `/admin/events/tickets?event_id=${eventId}`,
  )
}

async function loadTicket(
  ticketId: string,
) {
  const admin =
    createAdminClient()

  const { data: ticket } =
    await admin
      .from('tickets')
      .select(
        'id,event_id,ticket_order_id,ticket_code,status',
      )
      .eq('id', ticketId)
      .maybeSingle()

  if (!ticket) {
    redirect(
      '/admin/events/tickets?error=not_found',
    )
  }

  return {
    admin,
    ticket,
  }
}

export async function cancelTicket(
  formData: FormData,
) {
  const ticketId = text(
    formData,
    'ticket_id',
  )
  const reason = text(
    formData,
    'reason',
  )

  if (!ticketId || !reason) {
    redirect(
      '/admin/events/tickets?error=reason_required',
    )
  }

  const {
    ticket,
  } = await loadTicket(
    ticketId,
  )

  const { supabase } =
    await requirePermission(
      'events.manage',
      '/admin/events/tickets',
      'event',
      ticket.event_id,
    )

  const { error } =
    await supabase.rpc(
      'cancel_event_ticket',
      {
        p_ticket_id:
          ticket.id,
        p_reason: reason,
      },
    )

  if (error) {
    console.error(
      'cancelTicket',
      error,
    )

    redirect(
      returnUrl(
        ticket.event_id,
        {
          error:
            error.message.includes(
              'checked-in',
            )
              ? 'checked_in'
              : 'cancel_failed',
        },
      ),
    )
  }

  refreshTickets(
    ticket.event_id,
  )

  redirect(
    returnUrl(
      ticket.event_id,
      {
        cancelled: '1',
      },
    ),
  )
}

export async function reissueTicket(
  formData: FormData,
) {
  const ticketId = text(
    formData,
    'ticket_id',
  )
  const reason = text(
    formData,
    'reason',
  )

  if (!ticketId || !reason) {
    redirect(
      '/admin/events/tickets?error=reason_required',
    )
  }

  const {
    admin,
    ticket,
  } = await loadTicket(
    ticketId,
  )

  const { supabase } =
    await requirePermission(
      'events.manage',
      '/admin/events/tickets',
      'event',
      ticket.event_id,
    )

  const { data: event } =
    await admin
      .from('events')
      .select('starts_at')
      .eq(
        'id',
        ticket.event_id,
      )
      .maybeSingle()

  const newTicketId =
    randomUUID()
  const rawToken =
    makeTicketToken(
      newTicketId,
    )
  const newCode =
    replacementCode(
      event?.starts_at,
    )

  const { data, error } =
    await supabase.rpc(
      'reissue_event_ticket',
      {
        p_ticket_id:
          ticket.id,
        p_new_ticket_id:
          newTicketId,
        p_new_ticket_code:
          newCode,
        p_new_qr_token_hash:
          hashTicketToken(
            rawToken,
          ),
        p_reason: reason,
      },
    )

  if (error || !data?.length) {
    console.error(
      'reissueTicket',
      error,
    )

    redirect(
      returnUrl(
        ticket.event_id,
        {
          error:
            error?.message?.includes(
              'checked-in',
            )
              ? 'checked_in'
              : 'reissue_failed',
        },
      ),
    )
  }

  try {
    await deliverTicketOrderEmail(
      ticket.ticket_order_id,
      {
        force: true,
      },
    )
  } catch (deliveryError) {
    console.error(
      'reissue ticket email failed',
      deliveryError,
    )
  }

  refreshTickets(
    ticket.event_id,
  )

  redirect(
    returnUrl(
      ticket.event_id,
      {
        reissued: '1',
      },
    ),
  )
}
