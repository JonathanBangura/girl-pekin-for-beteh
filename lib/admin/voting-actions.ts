'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function num(formData: FormData, key: string) {
  return Number(text(formData, key))
}

function parseQuickQuantities(value: string) {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  ].slice(0, 8)
}

export async function saveVotePricing(formData: FormData) {
  const { userId } = await requirePermission(
    'voting.manage',
    '/admin/awards/voting',
  )

  const awardEditionId = text(formData, 'award_edition_id')
  const unitPrice = num(formData, 'unit_price')
  const currency = text(formData, 'currency').toUpperCase() || 'SLE'
  const minQuantity = num(formData, 'min_quantity')
  const maxQuantity = num(formData, 'max_quantity')
  const quickQuantities = parseQuickQuantities(text(formData, 'quick_quantities'))
  const isActive = formData.get('is_active') === 'on'

  if (
    !awardEditionId ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0 ||
    !Number.isInteger(minQuantity) ||
    minQuantity <= 0 ||
    !Number.isInteger(maxQuantity) ||
    maxQuantity < minQuantity
  ) {
    redirect('/admin/awards/voting?error=invalid_pricing')
  }

  const admin = createAdminClient()

  const { data: oldData } = await admin
    .from('vote_pricing')
    .select('*')
    .eq('award_edition_id', awardEditionId)
    .maybeSingle()

  const payload = {
    award_edition_id: awardEditionId,
    unit_price: unitPrice,
    currency,
    min_quantity: minQuantity,
    max_quantity: maxQuantity,
    quick_quantities: quickQuantities,
    is_active: isActive,
    updated_by: userId,
    created_by: oldData?.created_by ?? userId,
  }

  const { data: newData, error } = await admin
    .from('vote_pricing')
    .upsert(payload, { onConflict: 'award_edition_id' })
    .select()
    .single()

  if (error || !newData) {
    console.error('saveVotePricing', error)
    redirect('/admin/awards/voting?error=save_failed')
  }

  await admin.from('audit_logs').insert({
    actor_user_id: userId,
    action: oldData ? 'vote_pricing_updated' : 'vote_pricing_created',
    entity_type: 'vote_pricing',
    entity_id: newData.id,
    old_data: oldData ?? null,
    new_data: newData,
    metadata: {},
  })

  revalidatePath('/admin')
  revalidatePath('/admin/awards/voting')
  revalidatePath('/vote')
  revalidatePath('/nominees')
  redirect('/admin/awards/voting?saved=1')
}
