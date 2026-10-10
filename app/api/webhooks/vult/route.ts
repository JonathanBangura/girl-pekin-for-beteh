import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  parseVultWebhookPayload,
  verifyVultWebhookAuthorization,
} from '@/lib/vult/webhook'
import { issueTicketsForPaidOrder } from '@/lib/ticketing/ticket-issuance'
import { deliverTicketOrderEmail } from '@/lib/ticketing/ticket-email'
import { deliverDonationReceiptEmail } from '@/lib/donations/donation-email'

export const runtime = 'nodejs'

async function findPaymentByOrderId(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
) {
  const { data: voteOrder } = await admin
    .from('vote_orders')
    .select('id,order_number')
    .eq('order_number', orderId)
    .maybeSingle()

  if (voteOrder) {
    const { data: payment } = await admin
      .from('payments')
      .select('id,status,provider_payload')
      .eq('provider', 'vult')
      .eq('vote_order_id', voteOrder.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (payment) {
      return {
        kind: 'vote' as const,
        orderId: voteOrder.id,
        payment,
      }
    }
  }

  const { data: ticketOrder } = await admin
    .from('ticket_orders')
    .select('id,order_number')
    .eq('order_number', orderId)
    .maybeSingle()

  if (ticketOrder) {
    const { data: payment } = await admin
      .from('payments')
      .select('id,status,provider_payload')
      .eq('provider', 'vult')
      .eq('ticket_order_id', ticketOrder.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (payment) {
      return {
        kind: 'ticket' as const,
        orderId: ticketOrder.id,
        payment,
      }
    }
  }

  const { data: donation } = await admin
    .from('donations')
    .select('id,donation_number')
    .eq('donation_number', orderId)
    .maybeSingle()

  if (donation) {
    const { data: payment } = await admin
      .from('payments')
      .select('id,status,provider_payload')
      .eq('provider', 'vult')
      .eq('donation_id', donation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (payment) {
      return {
        kind: 'donation' as const,
        orderId: donation.id,
        payment,
      }
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  if (
    !verifyVultWebhookAuthorization(
      request.headers.get('authorization'),
    )
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    )
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      { status: 400 },
    )
  }

  const payload = parseVultWebhookPayload(rawBody)

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid Vult webhook payload.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const resolved = await findPaymentByOrderId(
    admin,
    payload.orderId,
  )

  if (!resolved) {
    console.error('Vult webhook order/payment not found', {
      orderId: payload.orderId,
      vultRequestId: payload.vultRequestId,
    })

    return NextResponse.json(
      { error: 'Order not found.' },
      { status: 404 },
    )
  }

  let eventId: number | null = null

  const { data: insertedEvent, error: insertEventError } =
    await admin
      .from('payment_events')
      .insert({
        provider: 'vult',
        provider_event_id: payload.vultRequestId,
        payment_id: resolved.payment.id,
        event_type: payload.status,
        payload: rawBody,
      })
      .select('id,processed_at')
      .single()

  if (insertEventError?.code === '23505') {
    const { data: existing } = await admin
      .from('payment_events')
      .select('id,processed_at,processing_error')
      .eq('provider', 'vult')
      .eq('provider_event_id', payload.vultRequestId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { error: 'Unable to resolve duplicate event.' },
        { status: 500 },
      )
    }

    if (existing.processed_at) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      })
    }

    eventId = existing.id
  } else if (insertEventError || !insertedEvent) {
    console.error(
      'Unable to persist Vult webhook',
      insertEventError,
    )

    return NextResponse.json(
      { error: 'Unable to persist webhook.' },
      { status: 500 },
    )
  } else {
    eventId = insertedEvent.id
  }

  if (payload.status === 'failed') {
    const currentPayload =
      resolved.payment.provider_payload &&
      typeof resolved.payment.provider_payload === 'object'
        ? resolved.payment.provider_payload
        : {}

    const failureMessage =
      resolved.kind === 'donation'
        ? 'Vult reported a failed donation payment attempt.'
        : 'Vult reported a failed payment attempt. Order remains pending for retry.'

    await admin
      .from('payments')
      .update({
        ...(resolved.kind === 'donation'
          ? { status: 'failed' }
          : {}),
        provider_payload: {
          ...currentPayload,
          last_webhook_status: 'failed',
          last_vult_request_id: payload.vultRequestId,
          last_webhook_payload: rawBody,
        },
        failure_reason: failureMessage,
      })
      .eq('id', resolved.payment.id)

    if (resolved.kind === 'donation') {
      await admin
        .from('donations')
        .update({
          status: 'failed',
        })
        .eq('id', resolved.orderId)
    }

    await admin
      .from('payment_events')
      .update({
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('id', eventId)

    return NextResponse.json({
      received: true,
      status: 'failed',
      order_kept_pending: resolved.kind !== 'donation',
    })
  }

  try {
    if (resolved.kind === 'vote') {
      const { error } = await admin.rpc(
        'settle_vote_payment_success',
        {
          p_payment_id: resolved.payment.id,
          p_provider_transaction_id: payload.vultRequestId,
          p_provider_payload: {
            last_webhook_status: 'completed',
            last_vult_request_id: payload.vultRequestId,
            webhook_payload: rawBody,
          },
          p_paid_at: new Date().toISOString(),
        },
      )

      if (error) throw error
    } else if (resolved.kind === 'ticket') {
      const { error } = await admin.rpc(
        'mark_ticket_payment_success',
        {
          p_payment_id: resolved.payment.id,
          p_provider_transaction_id: payload.vultRequestId,
          p_provider_payload: {
            last_webhook_status: 'completed',
            last_vult_request_id: payload.vultRequestId,
            webhook_payload: rawBody,
          },
          p_paid_at: new Date().toISOString(),
        },
      )

      if (error) throw error

      // Ticket issuance is idempotent. If webhook processing is retried,
      // the unique item/sequence constraint prevents duplicate tickets.
      await issueTicketsForPaidOrder(resolved.orderId)

      // Email failure must not roll back successful payment/ticket issuance.
      try {
        await deliverTicketOrderEmail(resolved.orderId)
      } catch (deliveryError) {
        console.error(
          'Ticket email delivery failed after successful payment',
          deliveryError,
        )
      }
    } else {
      const { error } = await admin.rpc(
        'mark_donation_payment_success',
        {
          p_payment_id: resolved.payment.id,
          p_provider_transaction_id: payload.vultRequestId,
          p_provider_payload: {
            last_webhook_status: 'completed',
            last_vult_request_id: payload.vultRequestId,
            webhook_payload: rawBody,
          },
          p_paid_at: new Date().toISOString(),
        },
      )

      if (error) throw error

      // Receipt email failure must never roll back a successful donation.
      try {
        await deliverDonationReceiptEmail(resolved.orderId)
      } catch (deliveryError) {
        console.error(
          'Donation acknowledgement email failed after successful payment',
          deliveryError,
        )
      }
    }

    await admin
      .from('payment_events')
      .update({
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('id', eventId)

    return NextResponse.json({
      received: true,
      processed: true,
      kind: resolved.kind,
    })
  } catch (error) {
    console.error('Vult webhook processing failed', error)

    await admin
      .from('payment_events')
      .update({
        processing_error:
          error instanceof Error
            ? error.message
            : 'Unknown webhook processing error',
      })
      .eq('id', eventId)

    return NextResponse.json({
      received: true,
      processed: false,
      reconciliation_required: true,
    })
  }
}
