'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function clean(value: FormDataEntryValue | null, max = 1000) {
  return String(value ?? '').trim().slice(0, max)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function optionalNumber(value: string) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function optionalDate(value: string) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString()
}

export async function saveDonationCampaignAction(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'donations.manage',
    '/admin/donations/campaigns',
  )

  const admin = createAdminClient()
  const id = clean(formData.get('id'), 80)
  const title = clean(formData.get('title'), 160)
  const requestedSlug = clean(formData.get('slug'), 140)
  const slug = slugify(requestedSlug || title)

  if (!title || !slug) {
    throw new Error('Campaign title is required.')
  }

  const campaignKind =
    clean(formData.get('campaign_kind'), 20) === 'general'
      ? 'general'
      : 'campaign'
  const fundType =
    clean(formData.get('fund_type'), 20) === 'unrestricted'
      ? 'unrestricted'
      : 'restricted'
  const statusRaw = clean(formData.get('status'), 30)
  const validStatuses = new Set([
    'draft',
    'active',
    'paused',
    'closed',
    'archived',
  ])
  const status = validStatuses.has(statusRaw)
    ? statusRaw
    : 'draft'

  const payload = {
    slug,
    title,
    summary: clean(formData.get('summary'), 500) || null,
    description:
      clean(formData.get('description'), 5000) || null,
    campaign_kind: campaignKind,
    fund_type: fundType,
    goal_amount: optionalNumber(
      clean(formData.get('goal_amount'), 30),
    ),
    currency: clean(formData.get('currency'), 10) || 'SLE',
    minimum_amount:
      optionalNumber(
        clean(formData.get('minimum_amount'), 30),
      ) ?? 10,
    cover_image_url:
      clean(formData.get('cover_image_url'), 1000) || null,
    starts_at: optionalDate(
      clean(formData.get('starts_at'), 50),
    ),
    ends_at: optionalDate(
      clean(formData.get('ends_at'), 50),
    ),
    status,
    is_public: formData.get('is_public') === 'on',
    show_progress: formData.get('show_progress') === 'on',
    sort_order:
      Number.parseInt(
        clean(formData.get('sort_order'), 20),
        10,
      ) || 0,
  }

  if (payload.minimum_amount <= 0) {
    throw new Error('Minimum donation must be greater than zero.')
  }

  if (
    payload.goal_amount != null &&
    payload.goal_amount <= 0
  ) {
    throw new Error('Campaign goal must be greater than zero.')
  }

  if (id) {
    const { data: oldData } = await admin
      .from('donation_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    const { data: newData, error } = await admin
      .from('donation_campaigns')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    await admin.from('audit_logs').insert({
      actor_user_id: userId,
      action: 'donation_campaign_updated',
      entity_type: 'donation_campaign',
      entity_id: id,
      old_data: oldData,
      new_data: newData,
      metadata: {},
    })
  } else {
    const { data: newData, error } = await admin
      .from('donation_campaigns')
      .insert({
        ...payload,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw error

    await admin.from('audit_logs').insert({
      actor_user_id: userId,
      action: 'donation_campaign_created',
      entity_type: 'donation_campaign',
      entity_id: newData.id,
      old_data: null,
      new_data: newData,
      metadata: {},
    })
  }

  revalidatePath('/donate')
  revalidatePath('/admin/donations')
  revalidatePath('/admin/donations/campaigns')
}
