import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/resend-rest'
import { issueTicketsForPaidOrder } from './ticket-issuance'

function appUrl() {
  const explicit =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (explicit) return explicit.replace(/\/+$/, '')

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL

  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, '')}`
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

function formatDate(value?: string | null) {
  if (!value) return 'To be confirmed'

  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Freetown',
  }).format(new Date(value))
}

function ticketEmailHtml(
  data: Awaited<ReturnType<typeof issueTicketsForPaidOrder>>,
) {
  const walletUrl =
    `${appUrl()}/tickets/order/${data.order.public_token}`

  const rows = data.tickets
    .map(
      (ticket) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e7ece9;">
            <strong>${esc(ticket.ticket_type_name)}</strong><br>
            <span style="color:#66766f;font-size:13px;">
              ${esc(ticket.ticket_code)}
            </span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #e7ece9;text-align:right;">
            Admission ${ticket.admission_sequence}
          </td>
        </tr>
      `,
    )
    .join('')

  return `
  <div style="margin:0;background:#f5f7f5;padding:28px 12px;font-family:Arial,sans-serif;color:#173a32;">
    <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e0e8e4;border-radius:16px;overflow:hidden;">
      <div style="background:#0d5f50;padding:26px;color:#fff;">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.78;">
          Girl Pikin For Betteh Foundation
        </div>
        <h1 style="margin:8px 0 0;font-size:28px;">Your event tickets are ready</h1>
      </div>

      <div style="padding:26px;">
        <p style="margin-top:0;line-height:1.6;">
          Payment has been confirmed for order
          <strong>${esc(data.order.order_number)}</strong>.
          Your individual QR tickets are now available.
        </p>

        <div style="background:#f6faf8;padding:18px;border-radius:10px;margin:20px 0;">
          <strong>${esc(data.event.title)}</strong><br>
          <span style="color:#66766f;">
            ${esc(formatDate(data.event.starts_at))}
            ${data.event.venue ? ` · ${esc(data.event.venue)}` : ''}
          </span>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:18px 0;">
          ${rows}
        </table>

        <a href="${walletUrl}"
          style="display:block;text-align:center;background:#0d5f50;color:#fff;text-decoration:none;padding:15px 18px;border-radius:9px;font-weight:700;margin-top:22px;">
          View My QR Tickets
        </a>

        <p style="color:#718079;font-size:12px;line-height:1.55;margin-top:20px;">
          Each admission has its own QR ticket. A ticket can be checked in only once.
        </p>
      </div>
    </div>
  </div>
  `
}

export async function deliverTicketOrderEmail(
  ticketOrderId: string,
  options: { force?: boolean } = {},
) {
  const admin = createAdminClient()
  const issuance = await issueTicketsForPaidOrder(ticketOrderId)

  const { data: currentOrder } = await admin
    .from('ticket_orders')
    .select('id,purchaser_email,delivery_status')
    .eq('id', ticketOrderId)
    .maybeSingle()

  if (!currentOrder) throw new Error('Ticket order not found.')

  if (
    currentOrder.delivery_status === 'sent' &&
    !options.force
  ) {
    return { sent: true, skipped: true }
  }

  if (!currentOrder.purchaser_email) {
    await admin
      .from('ticket_orders')
      .update({
        delivery_status: 'not_available',
        delivery_last_error:
          'No purchaser email address was provided.',
      })
      .eq('id', ticketOrderId)

    return { sent: false, skipped: true, reason: 'no_email' }
  }

  const attemptId = randomUUID()

  await admin.from('ticket_delivery_attempts').insert({
    id: attemptId,
    ticket_order_id: ticketOrderId,
    channel: 'email',
    recipient: currentOrder.purchaser_email,
    provider: 'resend',
    status: 'pending',
  })

  try {
    const response = await sendTransactionalEmail({
      to: currentOrder.purchaser_email,
      subject: `Your tickets — ${issuance.event.title}`,
      html: ticketEmailHtml(issuance),
      idempotencyKey: `ticket-delivery/${attemptId}`,
    })

    const now = new Date().toISOString()

    await Promise.all([
      admin
        .from('ticket_delivery_attempts')
        .update({
          status: 'sent',
          provider_message_id: response.id ?? null,
          completed_at: now,
          error_message: null,
        })
        .eq('id', attemptId),
      admin
        .from('ticket_orders')
        .update({
          delivery_status: 'sent',
          delivered_at: now,
          delivery_last_error: null,
        })
        .eq('id', ticketOrderId),
    ])

    return { sent: true, providerMessageId: response.id ?? null }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown email delivery error'

    await Promise.all([
      admin
        .from('ticket_delivery_attempts')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: message,
        })
        .eq('id', attemptId),
      admin
        .from('ticket_orders')
        .update({
          delivery_status: 'failed',
          delivery_last_error: message,
        })
        .eq('id', ticketOrderId),
    ])

    throw error
  }
}
