import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  parseVultWebhookPayload,
  verifyVultWebhookAuthorization,
} from '@/lib/vult/webhook'

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
    console.error('Unable to persist Vult webhook', insertEventError)

    return NextResponse.json(
      { error: 'Unable to persist webhook.' },
      { status: 500 },
    )
  } else {
    eventId = insertedEvent.id
  }

  // Vult's supplied documentation explicitly says a "failed" webhook means
  // the customer may retry later, so the merchant order must stay pending.
  if (payload.status === 'failed') {
    const currentPayload =
      resolved.payment.provider_payload &&
      typeof resolved.payment.provider_payload === 'object'
        ? resolved.payment.provider_payload
        : {}

    await admin
      .from('payments')
      .update({
        provider_payload: {
          ...currentPayload,
          last_webhook_status: 'failed',
          last_vult_request_id: payload.vultRequestId,
          last_webhook_payload: rawBody,
        },
        failure_reason:
          'Vult reported a failed payment attempt. Order remains pending for retry.',
      })
      .eq('id', resolved.payment.id)

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
      order_kept_pending: true,
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
    } else {
      // Payment/order become paid now. Individual QR ticket issuance remains
      // Phase 6B so raw QR delivery material is not lost before email/QR
      // delivery is connected.
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

    // Vult currently sends the webhook only once. The event is safely stored
    // for reconciliation and a replay of the same webhook can reprocess it
    // because processed_at remains null.
    return NextResponse.json({
      received: true,
      processed: false,
      reconciliation_required: true,
    })
  }
}
