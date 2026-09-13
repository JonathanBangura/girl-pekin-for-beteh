'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function refreshFinance() {
  revalidatePath('/admin')
  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/payments')
  revalidatePath('/admin/finance/reconciliation')
  revalidatePath('/admin/finance/refunds')
  revalidatePath('/admin/finance/reports')
  revalidatePath('/admin/awards/voting')
  revalidatePath('/admin/events/orders')
  revalidatePath('/nominees')
}

export async function recordExternalFullRefund(
  formData: FormData,
) {
  const { supabase } = await requirePermission(
    'finance.manage',
    '/admin/finance/refunds',
  )

  const paymentId = text(formData, 'payment_id')
  const refundKind = text(formData, 'refund_kind')
  const providerRefundId = text(
    formData,
    'provider_refund_id',
  )
  const externalMethod = text(
    formData,
    'external_method',
  )
  const reason = text(formData, 'reason')
  const notes = text(formData, 'notes')
  const confirmation = formData.get('confirmation') === 'on'

  if (
    !paymentId ||
    !['refund', 'reversal'].includes(refundKind) ||
    !providerRefundId ||
    !externalMethod ||
    !reason
  ) {
    redirect(
      '/admin/finance/refunds?error=missing_fields',
    )
  }

  if (!confirmation) {
    redirect(
      '/admin/finance/refunds?error=confirmation_required',
    )
  }

  const { data, error } = await supabase.rpc(
    'record_external_full_refund',
    {
      p_payment_id: paymentId,
      p_refund_kind: refundKind,
      p_provider_refund_id: providerRefundId,
      p_external_method: externalMethod,
      p_reason: reason,
      p_notes: notes || null,
    },
  )

  if (error) {
    console.error(
      'recordExternalFullRefund',
      error,
    )

    redirect(
      `/admin/finance/refunds?error=${encodeURIComponent(
        error.code || 'record_failed',
      )}`,
    )
  }

  if (!data) {
    redirect(
      '/admin/finance/refunds?error=record_failed',
    )
  }

  refreshFinance()
  redirect('/admin/finance/refunds?recorded=1')
}
