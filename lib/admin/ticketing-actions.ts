'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function optionalNumber(formData: FormData, key: string) {
  const raw = text(formData, key)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function optionalDate(formData: FormData, key: string) {
  const raw = text(formData, key)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function refreshTicketing() {
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  revalidatePath('/admin/events/ticket-types')
  revalidatePath('/admin/events/orders')
  revalidatePath('/events')
}

export async function saveTicketType(formData: FormData) {
  const { userId } = await requirePermission(
    'events.manage',
    '/admin/events/ticket-types',
  )

  const ticketTypeId = text(formData, 'ticket_type_id')
  const eventId = text(formData, 'event_id')
  const name = text(formData, 'name')
  const description = text(formData, 'description')
  const pricingType = text(formData, 'pricing_type')
  const currency = text(formData, 'currency').toUpperCase() || 'SLE'
  const price = optionalNumber(formData, 'price')
  const minDonation = optionalNumber(formData, 'min_donation')
  const capacity = optionalNumber(formData, 'capacity')
  const maxPerOrder = optionalNumber(formData, 'max_per_order')
  const admissionsPerUnit = optionalNumber(
    formData,
    'admissions_per_unit',
  ) ?? 1
  const sortOrder = optionalNumber(formData, 'sort_order') ?? 0
  const salesStartsAt = optionalDate(formData, 'sales_starts_at')
  const salesEndsAt = optionalDate(formData, 'sales_ends_at')
  const isActive = formData.get('is_active') === 'on'

  if (
    !eventId ||
    !name ||
    !['fixed', 'donation', 'free'].includes(pricingType) ||
    admissionsPerUnit <= 0
  ) {
    redirect('/admin/events/ticket-types?error=invalid_fields')
  }

  if (pricingType === 'fixed' && (price == null || price < 0)) {
    redirect('/admin/events/ticket-types?error=invalid_price')
  }

  if (
    pricingType === 'donation' &&
    minDonation != null &&
    minDonation < 0
  ) {
    redirect('/admin/events/ticket-types?error=invalid_donation')
  }

  if (maxPerOrder != null && maxPerOrder <= 0) {
    redirect('/admin/events/ticket-types?error=invalid_max')
  }

  const admin = createAdminClient()

  const payload = {
    event_id: eventId,
    name,
    description: description || null,
    pricing_type: pricingType,
    price: pricingType === 'fixed' ? price : null,
    min_donation: pricingType === 'donation' ? minDonation ?? 0 : null,
    currency,
    capacity,
    sales_starts_at: salesStartsAt,
    sales_ends_at: salesEndsAt,
    max_per_order: maxPerOrder,
    admissions_per_unit: Math.floor(admissionsPerUnit),
    is_active: isActive,
    sort_order: Math.floor(sortOrder),
  }

  let oldData = null
  if (ticketTypeId) {
    const result = await admin
      .from('ticket_types')
      .select('*')
      .eq('id', ticketTypeId)
      .maybeSingle()
    oldData = result.data
  }

  let result

  if (ticketTypeId) {
    result = await admin
      .from('ticket_types')
      .update(payload)
      .eq('id', ticketTypeId)
      .select()
      .single()
  } else {
    result = await admin
      .from('ticket_types')
      .insert({
        ...payload,
        created_by: userId,
      })
      .select()
      .single()
  }

  if (result.error || !result.data) {
    console.error('saveTicketType', result.error)
    redirect(
      `/admin/events/ticket-types?error=${encodeURIComponent(
        result.error?.code || 'save_failed',
      )}`,
    )
  }

  await admin.from('audit_logs').insert({
    actor_user_id: userId,
    action: ticketTypeId ? 'ticket_type_updated' : 'ticket_type_created',
    entity_type: 'ticket_type',
    entity_id: result.data.id,
    old_data: oldData,
    new_data: result.data,
    metadata: {},
  })

  refreshTicketing()
  const { data: event } = await admin
    .from('events')
    .select('slug')
    .eq('id', eventId)
    .maybeSingle()

  if (event?.slug) {
    revalidatePath(`/events/${event.slug}`)
    revalidatePath(`/events/${event.slug}/tickets`)
  }

  redirect('/admin/events/ticket-types?saved=1')
}
