import { requireAnyPermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isoDateStart(value?: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString()
}

function isoDateEnd(value?: string) {
  if (!value) return null
  const date = new Date(`${value}T23:59:59.999Z`)
  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString()
}

async function requireDonationRead(nextPath: string) {
  return requireAnyPermission(
    ['donations.read', 'donations.manage'],
    nextPath,
  )
}

export async function getDonationOverviewData() {
  await requireDonationRead('/admin/donations')
  const admin = createAdminClient()

  const [
    reportResult,
    activeCampaignsResult,
    recentResult,
  ] = await Promise.all([
    admin.rpc('donation_report_summary', {
      p_from: null,
      p_to: null,
    }),
    admin
      .from('donation_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin
      .from('donations')
      .select(
        `
        id,
        donation_number,
        donor_type,
        donor_name,
        organisation_name,
        is_anonymous,
        amount,
        currency,
        paid_at,
        campaign:donation_campaigns(title,slug,fund_type)
        `,
      )
      .eq('status', 'succeeded')
      .order('paid_at', { ascending: false })
      .limit(12),
  ])

  if (reportResult.error) {
    console.error('donation overview report', reportResult.error)
    throw new Error('Unable to load donation overview.')
  }

  if (recentResult.error) {
    console.error('donation overview recent', recentResult.error)
    throw new Error('Unable to load recent donations.')
  }

  const report = (reportResult.data?.[0] ?? {}) as any

  return {
    donationCount: toNumber(report.donation_count),
    activeCampaigns: activeCampaignsResult.count ?? 0,
    byCurrency: Array.isArray(report.by_currency)
      ? report.by_currency
      : [],
    byCampaign: Array.isArray(report.by_campaign)
      ? report.by_campaign
      : [],
    byMethod: Array.isArray(report.by_method)
      ? report.by_method
      : [],
    recent: recentResult.data ?? [],
  }
}

export async function getDonationCampaignsAdminData() {
  await requireAnyPermission(
    ['donations.manage'],
    '/admin/donations/campaigns',
  )
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('donation_campaigns')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('donation campaigns admin', error)
    throw new Error('Unable to load donation campaigns.')
  }

  return data ?? []
}

export async function getDonationListData(
  filters: {
    status?: string
    campaign?: string
    q?: string
    page?: string
  } = {},
) {
  await requireDonationRead('/admin/donations/donations')
  const admin = createAdminClient()

  const page = Math.max(
    1,
    Number.parseInt(filters.page ?? '1', 10) || 1,
  )
  const pageSize = 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = admin
    .from('donations')
    .select(
      `
      id,
      donation_number,
      donor_type,
      donor_name,
      organisation_name,
      donor_email,
      donor_phone,
      is_anonymous,
      message,
      amount,
      currency,
      status,
      paid_at,
      created_at,
      receipt_email_sent_at,
      receipt_email_error,
      campaign:donation_campaigns(id,title,slug,fund_type)
      `,
      { count: 'exact' },
    )

  const status = filters.status?.trim() ?? ''
  const campaign = filters.campaign?.trim() ?? ''
  const q = filters.q?.trim() ?? ''

  if (status) query = query.eq('status', status)
  if (campaign) query = query.eq('campaign_id', campaign)

  if (q) {
    const safeQuery = q
      .replaceAll('%', '')
      .replaceAll(',', '')
      .slice(0, 100)
    query = query.ilike(
      'donation_number',
      `%${safeQuery}%`,
    )
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('donation list admin', error)
    throw new Error('Unable to load donations.')
  }

  const { data: campaigns } = await admin
    .from('donation_campaigns')
    .select('id,title')
    .order('title')

  const totalCount = count ?? 0

  return {
    donations: data ?? [],
    campaigns: campaigns ?? [],
    status,
    campaign,
    q,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  }
}

export async function getDonationDonorsData() {
  await requireDonationRead('/admin/donations/donors')
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('donations')
    .select(
      `
      id,
      donor_type,
      donor_name,
      organisation_name,
      donor_email,
      donor_phone,
      is_anonymous,
      amount,
      currency,
      paid_at
      `,
    )
    .eq('status', 'succeeded')
    .eq('is_anonymous', false)
    .order('paid_at', { ascending: false })
    .limit(5000)

  if (error) {
    console.error('donation donors admin', error)
    throw new Error('Unable to load donor summary.')
  }

  type DonorRow = {
    key: string
    name: string
    donorType: string
    email: string | null
    phone: string | null
    donationCount: number
    totalByCurrency: Record<string, number>
    lastDonationAt: string | null
  }

  const donors = new Map<string, DonorRow>()

  for (const item of data ?? []) {
    const email =
      typeof item.donor_email === 'string'
        ? item.donor_email.toLowerCase()
        : null
    const phone =
      typeof item.donor_phone === 'string'
        ? item.donor_phone
        : null
    const displayName =
      item.donor_type === 'organisation'
        ? item.organisation_name ||
          item.donor_name ||
          'Organisation donor'
        : item.donor_name || 'Donor'

    const key =
      email
        ? `email:${email}`
        : phone
          ? `phone:${phone}`
          : `name:${item.donor_type}:${String(displayName).toLowerCase()}`

    const existing = donors.get(key) ?? {
      key,
      name: String(displayName),
      donorType: String(item.donor_type),
      email,
      phone,
      donationCount: 0,
      totalByCurrency: {},
      lastDonationAt:
        typeof item.paid_at === 'string'
          ? item.paid_at
          : null,
    }

    existing.donationCount += 1
    const currency = String(item.currency ?? 'SLE')
    existing.totalByCurrency[currency] =
      (existing.totalByCurrency[currency] ?? 0) +
      toNumber(item.amount)

    if (
      typeof item.paid_at === 'string' &&
      (!existing.lastDonationAt ||
        item.paid_at > existing.lastDonationAt)
    ) {
      existing.lastDonationAt = item.paid_at
    }

    donors.set(key, existing)
  }

  return [...donors.values()].sort((a, b) => {
    const aTime = a.lastDonationAt
      ? new Date(a.lastDonationAt).getTime()
      : 0
    const bTime = b.lastDonationAt
      ? new Date(b.lastDonationAt).getTime()
      : 0
    return bTime - aTime
  })
}

export async function getDonationReportsData(filters: {
  from?: string
  to?: string
}) {
  await requireDonationRead('/admin/donations/reports')
  const admin = createAdminClient()

  const { data, error } = await admin.rpc(
    'donation_report_summary',
    {
      p_from: isoDateStart(filters.from),
      p_to: isoDateEnd(filters.to),
    },
  )

  if (error) {
    console.error('donation reports', error)
    throw new Error('Unable to load donation reports.')
  }

  const report = (data?.[0] ?? {}) as any

  return {
    from: filters.from ?? '',
    to: filters.to ?? '',
    donationCount: toNumber(report.donation_count),
    byCurrency: Array.isArray(report.by_currency)
      ? report.by_currency
      : [],
    byCampaign: Array.isArray(report.by_campaign)
      ? report.by_campaign
      : [],
    byMethod: Array.isArray(report.by_method)
      ? report.by_method
      : [],
    byDonorType: Array.isArray(report.by_donor_type)
      ? report.by_donor_type
      : [],
  }
}
