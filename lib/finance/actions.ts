'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueTicketsForPaidOrder } from '@/lib/ticketing/ticket-issuance'
import { deliverTicketOrderEmail } from '@/lib/ticketing/ticket-email'

function refreshFinance() {
  revalidatePath('/admin')
  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/payments')
  revalidatePath('/admin/finance/reconciliation')
  revalidatePath('/admin/events/orders')
  revalidatePath('/admin/awards/voting')
}

async function audit({
  admin,
  actorUserId,
  action,
  entityType,
  entityId,
  newData,
}: {
  admin: ReturnType<typeof createAdminClient>
  actorUserId: string
  action: string
  entityType: string
  entityId: string | null
  newData: unknown
}) {
  const { error } = await admin.from('audit_logs').insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: null,
    new_data: newData,
    metadata: {},
  })

  if (error) {
    console.error('finance audit insert failed', error)
  }
}

async function settleInternalPayment({
  admin,
  payment,
  providerTransactionId,
  providerPayload,
  paidAt,
}: {
  admin: ReturnType<typeof createAdminClient>
  payment: any
  providerTransactionId: string
  providerPayload: Record<string, unknown>
  paidAt: string
}) {
  if (payment.payment_type === 'vote') {
    const { error } = await admin.rpc(
      'settle_vote_payment_success',
      {
        p_payment_id: payment.id,
        p_provider_transaction_id:
          providerTransactionId,
        p_provider_payload: providerPayload,
        p_paid_at: paidAt,
      },
    )

    if (error) throw error

    return {
      kind: 'vote',
      email: 'not_applicable',
    }
  }

  if (payment.payment_type === 'ticket') {
    const { error } = await admin.rpc(
      'mark_ticket_payment_success',
      {
        p_payment_id: payment.id,
        p_provider_transaction_id:
          providerTransactionId,
        p_provider_payload: providerPayload,
        p_paid_at: paidAt,
      },
    )

    if (error) throw error

    const issued = await issueTicketsForPaidOrder(
      payment.ticket_order_id,
    )

    let emailStatus = 'not_available'

    try {
      const delivery = await deliverTicketOrderEmail(
        payment.ticket_order_id,
      )

      emailStatus = delivery.sent
        ? 'sent_or_already_sent'
        : String(delivery.reason ?? 'not_sent')
    } catch (emailError) {
      console.error(
        'finance settlement ticket email retry failed',
        emailError,
      )
      emailStatus = 'failed'
    }

    return {
      kind: 'ticket',
      issued_tickets: issued.tickets.length,
      email: emailStatus,
    }
  }

  throw new Error(
    `Unsupported finance settlement type: ${payment.payment_type}`,
  )
}

export async function reprocessPaymentEvent(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'finance.manage',
    '/admin/finance/reconciliation',
  )

  const rawId = String(
    formData.get('payment_event_id') ?? '',
  ).trim()
  const eventId = Number.parseInt(rawId, 10)

  if (!Number.isFinite(eventId)) {
    redirect(
      '/admin/finance/reconciliation?error=invalid_event',
    )
  }

  const admin = createAdminClient()

  const { data: event, error: eventError } =
    await admin
      .from('payment_events')
      .select(
        'id,provider,provider_event_id,payment_id,event_type,payload,processed_at,processing_error,received_at',
      )
      .eq('id', eventId)
      .maybeSingle()

  if (eventError || !event) {
    console.error('reprocess payment event load', eventError)
    redirect(
      '/admin/finance/reconciliation?error=event_not_found',
    )
  }

  if (
    event.provider !== 'vult' ||
    event.event_type !== 'completed' ||
    !event.payment_id
  ) {
    redirect(
      '/admin/finance/reconciliation?error=event_not_reprocessable',
    )
  }

  const { data: payment, error: paymentError } =
    await admin
      .from('payments')
      .select('*')
      .eq('id', event.payment_id)
      .maybeSingle()

  if (paymentError || !payment) {
    console.error(
      'reprocess payment event payment',
      paymentError,
    )
    redirect(
      '/admin/finance/reconciliation?error=payment_not_found',
    )
  }

  try {
    const result = await settleInternalPayment({
      admin,
      payment,
      providerTransactionId:
        event.provider_event_id,
      providerPayload: {
        finance_reprocessed: true,
        finance_reprocessed_at:
          new Date().toISOString(),
        original_webhook_payload:
          event.payload ?? {},
      },
      paidAt:
        payment.paid_at ??
        event.received_at ??
        new Date().toISOString(),
    })

    const now = new Date().toISOString()

    await admin
      .from('payment_events')
      .update({
        processed_at: now,
        processing_error: null,
      })
      .eq('id', event.id)

    await audit({
      admin,
      actorUserId: userId,
      action: 'finance_payment_event_reprocessed',
      entityType: 'payment_event',
      entityId: null,
      newData: {
        payment_event_id: event.id,
        payment_id: payment.id,
        result,
      },
    })

    refreshFinance()
    redirect(
      '/admin/finance/reconciliation?reprocessed=1',
    )
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown reconciliation error'

    console.error(
      'finance payment event reprocess failed',
      error,
    )

    await admin
      .from('payment_events')
      .update({
        processing_error: message,
      })
      .eq('id', event.id)

    redirect(
      '/admin/finance/reconciliation?error=reprocess_failed',
    )
  }
}

export async function repairPaymentSettlement(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'finance.manage',
    '/admin/finance/reconciliation',
  )

  const paymentId = String(
    formData.get('payment_id') ?? '',
  ).trim()

  if (!paymentId) {
    redirect(
      '/admin/finance/reconciliation?error=payment_not_found',
    )
  }

  const admin = createAdminClient()

  const { data: payment, error: paymentError } =
    await admin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle()

  if (paymentError || !payment) {
    console.error(
      'repair payment settlement load',
      paymentError,
    )
    redirect(
      '/admin/finance/reconciliation?error=payment_not_found',
    )
  }

  if (payment.status !== 'succeeded') {
    redirect(
      '/admin/finance/reconciliation?error=payment_not_succeeded',
    )
  }

  const { data: completedEvent } = await admin
    .from('payment_events')
    .select(
      'id,provider_event_id,payload,received_at',
    )
    .eq('payment_id', payment.id)
    .eq('event_type', 'completed')
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const providerTransactionId =
    payment.provider_transaction_id ??
    completedEvent?.provider_event_id ??
    null

  if (!providerTransactionId) {
    redirect(
      '/admin/finance/reconciliation?error=provider_reference_missing',
    )
  }

  try {
    const result = await settleInternalPayment({
      admin,
      payment,
      providerTransactionId,
      providerPayload: {
        finance_repair: true,
        finance_repaired_at:
          new Date().toISOString(),
        reconciliation_source:
          completedEvent?.payload ?? {},
      },
      paidAt:
        payment.paid_at ??
        completedEvent?.received_at ??
        new Date().toISOString(),
    })

    await audit({
      admin,
      actorUserId: userId,
      action: 'finance_payment_settlement_repaired',
      entityType: 'payment',
      entityId: payment.id,
      newData: result,
    })

    refreshFinance()
    redirect(
      '/admin/finance/reconciliation?repaired=1',
    )
  } catch (error) {
    console.error(
      'finance payment settlement repair failed',
      error,
    )

    redirect(
      '/admin/finance/reconciliation?error=repair_failed',
    )
  }
}
