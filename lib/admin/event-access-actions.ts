'use server'

import {
  revalidatePath,
} from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/resend-rest'
import { issueTicketsForOrder } from '@/lib/ticketing/ticket-issuance'
import { deliverTicketOrderEmail } from '@/lib/ticketing/ticket-email'

function text(
  formData: FormData,
  key: string,
) {
  return String(
    formData.get(key) ?? '',
  ).trim()
}

function appUrl() {
  const explicit =
    process.env.APP_URL?.trim() ||
    process.env
      .NEXT_PUBLIC_SITE_URL?.trim()

  if (explicit) {
    return explicit.replace(
      /\/+$/,
      '',
    )
  }

  const vercel =
    process.env
      .VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL

  if (vercel) {
    return `https://${vercel.replace(
      /^https?:\/\//,
      '',
    )}`
  }

  return 'https://www.girlpikinforbeteh.org'
}

function esc(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function refreshEventAccess(
  eventId?: string,
) {
  revalidatePath(
    '/admin/events/access',
  )
  revalidatePath(
    '/admin/events/tickets',
  )
  revalidatePath(
    '/admin/events/orders',
  )
  revalidatePath('/events')

  if (eventId) {
    revalidatePath(
      `/admin/events/access?event_id=${eventId}`,
    )
  }
}

export async function createEventInvitation(
  formData: FormData,
) {
  const eventId = text(
    formData,
    'event_id',
  )
  const ticketTypeId = text(
    formData,
    'ticket_type_id',
  )
  const inviteeName = text(
    formData,
    'invitee_name',
  )
  const inviteeEmail = text(
    formData,
    'invitee_email',
  ).toLowerCase()
  const inviteePhone = text(
    formData,
    'invitee_phone',
  )
  const quantity = Number(
    text(
      formData,
      'quantity',
    ),
  )
  const expiresRaw = text(
    formData,
    'expires_at',
  )
  const note = text(
    formData,
    'note',
  )

  if (
    !eventId ||
    !ticketTypeId ||
    !inviteeName ||
    !Number.isInteger(
      quantity,
    ) ||
    quantity <= 0
  ) {
    redirect(
      '/admin/events/access?error=invalid_invitation',
    )
  }

  const { userId } =
    await requirePermission(
      'events.manage',
      '/admin/events/access',
      'event',
      eventId,
    )

  const admin =
    createAdminClient()

  const [
    { data: event },
    { data: ticketType },
  ] = await Promise.all([
    admin
      .from('events')
      .select(
        'id,title,slug,access_type,status,starts_at',
      )
      .eq('id', eventId)
      .maybeSingle(),
    admin
      .from('ticket_types')
      .select(
        'id,event_id,name,is_active,max_per_order',
      )
      .eq(
        'id',
        ticketTypeId,
      )
      .maybeSingle(),
  ])

  if (
    !event ||
    !ticketType ||
    ticketType.event_id !==
      eventId
  ) {
    redirect(
      `/admin/events/access?event_id=${eventId}&error=invalid_ticket_type`,
    )
  }

  if (
    event.access_type !==
      'invitation_only'
  ) {
    redirect(
      `/admin/events/access?event_id=${eventId}&error=not_invitation_event`,
    )
  }

  if (
    ticketType.max_per_order &&
    quantity >
      ticketType.max_per_order
  ) {
    redirect(
      `/admin/events/access?event_id=${eventId}&error=quantity_limit`,
    )
  }

  const expiresAt = expiresRaw
    ? new Date(
        expiresRaw,
      ).toISOString()
    : null

  const {
    data: invitation,
    error,
  } = await admin
    .from('event_invitations')
    .insert({
      event_id: eventId,
      ticket_type_id:
        ticketTypeId,
      invitee_name:
        inviteeName,
      invitee_email:
        inviteeEmail || null,
      invitee_phone:
        inviteePhone || null,
      quantity,
      expires_at: expiresAt,
      note: note || null,
      created_by: userId,
    })
    .select(
      'id,invite_token,invitee_email',
    )
    .single()

  if (error || !invitation) {
    console.error(
      'createEventInvitation',
      error,
    )
    redirect(
      `/admin/events/access?event_id=${eventId}&error=invite_failed`,
    )
  }

  await admin
    .from('audit_logs')
    .insert({
      actor_user_id: userId,
      action:
        'event_invitation_created',
      entity_type:
        'event_invitation',
      entity_id:
        invitation.id,
      old_data: null,
      new_data: {
        event_id: eventId,
        ticket_type_id:
          ticketTypeId,
        quantity,
        invitee_name:
          inviteeName,
      },
      metadata: {},
    })

  if (invitation.invitee_email) {
    const claimUrl =
      `${appUrl()}/events/${event.slug}/invite/${invitation.invite_token}`

    try {
      await sendTransactionalEmail({
        to: invitation.invitee_email,
        subject: `Invitation — ${event.title}`,
        idempotencyKey:
          `event-invitation/${invitation.id}`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#f5f7f5;padding:24px;">
            <div style="max-width:620px;margin:auto;background:white;padding:28px;border-radius:14px;">
              <h1 style="color:#0d5f50;margin-top:0;">You're invited</h1>
              <p>Hello ${esc(inviteeName)},</p>
              <p>You have been invited to <strong>${esc(event.title)}</strong>.</p>
              <p>Your access tier is <strong>${esc(ticketType.name)}</strong>.</p>
              <a href="${claimUrl}" style="display:block;background:#0d5f50;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:700;">
                Claim Invitation
              </a>
              <p style="font-size:12px;color:#66766f;margin-top:18px;">This invitation link is private. Do not forward it.</p>
            </div>
          </div>
        `,
      })
    } catch (emailError) {
      console.error(
        'invitation email failed',
        emailError,
      )
    }
  }

  refreshEventAccess(eventId)

  redirect(
    `/admin/events/access?event_id=${eventId}&invited=1`,
  )
}

export async function revokeEventInvitation(
  formData: FormData,
) {
  const invitationId = text(
    formData,
    'invitation_id',
  )

  if (!invitationId) {
    redirect(
      '/admin/events/access?error=missing_invitation',
    )
  }

  const admin =
    createAdminClient()

  const { data: invitation } =
    await admin
      .from(
        'event_invitations',
      )
      .select(
        'id,event_id,status',
      )
      .eq('id', invitationId)
      .maybeSingle()

  if (!invitation) {
    redirect(
      '/admin/events/access?error=not_found',
    )
  }

  const { userId } =
    await requirePermission(
      'events.manage',
      '/admin/events/access',
      'event',
      invitation.event_id,
    )

  if (
    invitation.status ===
      'claimed'
  ) {
    redirect(
      `/admin/events/access?event_id=${invitation.event_id}&error=claimed_invitation`,
    )
  }

  const { data: updated } =
    await admin
      .from(
        'event_invitations',
      )
      .update({
        status: 'revoked',
      })
      .eq('id', invitation.id)
      .select()
      .single()

  await admin
    .from('audit_logs')
    .insert({
      actor_user_id: userId,
      action:
        'event_invitation_revoked',
      entity_type:
        'event_invitation',
      entity_id:
        invitation.id,
      old_data: invitation,
      new_data: updated,
      metadata: {},
    })

  refreshEventAccess(
    invitation.event_id,
  )

  redirect(
    `/admin/events/access?event_id=${invitation.event_id}&revoked=1`,
  )
}

export async function issueComplimentaryAdmission(
  formData: FormData,
) {
  const eventId = text(
    formData,
    'event_id',
  )
  const ticketTypeId = text(
    formData,
    'ticket_type_id',
  )
  const quantity = Number(
    text(
      formData,
      'quantity',
    ),
  )
  const guestName = text(
    formData,
    'guest_name',
  )
  const guestEmail = text(
    formData,
    'guest_email',
  ).toLowerCase()
  const guestPhone = text(
    formData,
    'guest_phone',
  )
  const reason = text(
    formData,
    'reason',
  )

  if (
    !eventId ||
    !ticketTypeId ||
    !guestName ||
    !reason ||
    !Number.isInteger(
      quantity,
    ) ||
    quantity <= 0
  ) {
    redirect(
      '/admin/events/access?error=invalid_complimentary',
    )
  }

  const { supabase } =
    await requirePermission(
      'events.manage',
      '/admin/events/access',
      'event',
      eventId,
    )

  const { data, error } =
    await supabase.rpc(
      'create_complimentary_ticket_order',
      {
        p_event_id: eventId,
        p_ticket_type_id:
          ticketTypeId,
        p_quantity: quantity,
        p_guest_name:
          guestName,
        p_guest_email:
          guestEmail || null,
        p_guest_phone:
          guestPhone || null,
        p_reason: reason,
      },
    )

  const order = data?.[0]

  if (error || !order) {
    console.error(
      'issueComplimentaryAdmission',
      error,
    )

    redirect(
      `/admin/events/access?event_id=${eventId}&error=complimentary_failed`,
    )
  }

  await issueTicketsForOrder(
    order.ticket_order_id,
  )

  try {
    await deliverTicketOrderEmail(
      order.ticket_order_id,
    )
  } catch (deliveryError) {
    console.error(
      'complimentary ticket email failed',
      deliveryError,
    )
  }

  refreshEventAccess(eventId)

  redirect(
    `/admin/events/access?event_id=${eventId}&complimentary=1`,
  )
}
