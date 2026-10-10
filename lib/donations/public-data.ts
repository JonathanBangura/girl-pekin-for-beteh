import { createPublicClient } from '@/lib/supabase/public'

export type PublicDonationCampaign = {
  id: string
  slug: string
  title: string
  summary: string | null
  description: string | null
  campaign_kind: 'general' | 'campaign'
  fund_type: 'unrestricted' | 'restricted'
  goal_amount: number | null
  currency: string
  minimum_amount: number
  cover_image_url: string | null
  starts_at: string | null
  ends_at: string | null
  show_progress: boolean
  raised_amount: number
  donation_count: number
}

function numberOrZero(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getPublicDonationCampaigns(
  slug?: string | null,
): Promise<PublicDonationCampaign[]> {
  const supabase = createPublicClient()

  const { data, error } = await supabase.rpc(
    'get_public_donation_campaigns',
    {
      p_slug: slug?.trim() || null,
    },
  )

  if (error) {
    console.error('public donation campaigns', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary:
      typeof row.summary === 'string' ? row.summary : null,
    description:
      typeof row.description === 'string'
        ? row.description
        : null,
    campaign_kind:
      row.campaign_kind === 'general'
        ? 'general'
        : 'campaign',
    fund_type:
      row.fund_type === 'unrestricted'
        ? 'unrestricted'
        : 'restricted',
    goal_amount:
      row.goal_amount == null
        ? null
        : numberOrZero(row.goal_amount),
    currency: String(row.currency ?? 'SLE'),
    minimum_amount: numberOrZero(row.minimum_amount),
    cover_image_url:
      typeof row.cover_image_url === 'string'
        ? row.cover_image_url
        : null,
    starts_at:
      typeof row.starts_at === 'string'
        ? row.starts_at
        : null,
    ends_at:
      typeof row.ends_at === 'string'
        ? row.ends_at
        : null,
    show_progress: row.show_progress === true,
    raised_amount: numberOrZero(row.raised_amount),
    donation_count: numberOrZero(row.donation_count),
  }))
}

export type PublicDonationReceipt = {
  donation_number: string
  donation_status: string
  donor_display_name: string
  amount: number
  currency: string
  campaign_title: string
  campaign_slug: string
  fund_type: string
  payment_method: string
  provider_transaction_id: string | null
  paid_at: string | null
}

export async function getPublicDonationReceipt(
  token: string,
): Promise<PublicDonationReceipt | null> {
  const supabase = createPublicClient()

  const { data, error } = await supabase.rpc(
    'get_public_donation_receipt',
    {
      p_public_token: token,
    },
  )

  if (error || !data?.length) {
    if (error) {
      console.error('public donation receipt', error)
    }
    return null
  }

  const row = data[0] as any

  return {
    donation_number: String(row.donation_number),
    donation_status: String(row.donation_status),
    donor_display_name: String(row.donor_display_name),
    amount: numberOrZero(row.amount),
    currency: String(row.currency ?? 'SLE'),
    campaign_title: String(row.campaign_title),
    campaign_slug: String(row.campaign_slug),
    fund_type: String(row.fund_type),
    payment_method: String(row.payment_method ?? 'unknown'),
    provider_transaction_id:
      typeof row.provider_transaction_id === 'string'
        ? row.provider_transaction_id
        : null,
    paid_at:
      typeof row.paid_at === 'string' ? row.paid_at : null,
  }
}
