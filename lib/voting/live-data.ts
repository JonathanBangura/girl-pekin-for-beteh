import { createPublicClient } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getPublicVoteOffer(code: string) {
  const supabase = createPublicClient()

  const { data: nominee } = await supabase
    .from('nominees')
    .select('id,award_edition_id,category_id,nominee_code,full_name,institution,bio,photo_url')
    .ilike('nominee_code', code)
    .maybeSingle()

  if (!nominee) return null

  const [{ data: edition }, { data: category }, { data: pricing }] =
    await Promise.all([
      supabase
        .from('award_editions')
        .select('id,year,edition_label,status,voting_starts_at,voting_ends_at,leaderboard_visibility')
        .eq('id', nominee.award_edition_id)
        .maybeSingle(),
      supabase
        .from('award_categories')
        .select('id,name')
        .eq('id', nominee.category_id)
        .maybeSingle(),
      supabase
        .from('vote_pricing')
        .select('id,unit_price,currency,min_quantity,max_quantity,quick_quantities,is_active')
        .eq('award_edition_id', nominee.award_edition_id)
        .maybeSingle(),
    ])

  if (!edition) return null

  const now = Date.now()
  const starts = edition.voting_starts_at ? new Date(edition.voting_starts_at).getTime() : null
  const ends = edition.voting_ends_at ? new Date(edition.voting_ends_at).getTime() : null

  const isOpen =
    edition.status === 'voting_open' &&
    Boolean(pricing?.is_active) &&
    (starts === null || now >= starts) &&
    (ends === null || now <= ends)

  return {
    nominee: {
      ...nominee,
      category_name: category?.name ?? 'Uncategorized',
    },
    edition,
    pricing: pricing
      ? {
          unit_price: toNumber(pricing.unit_price),
          currency: pricing.currency,
          min_quantity: pricing.min_quantity,
          max_quantity: pricing.max_quantity,
          quick_quantities: Array.isArray(pricing.quick_quantities)
            ? pricing.quick_quantities
            : [],
        }
      : null,
    isOpen,
  }
}

export async function getPublicVoteOrderStatus(token: string) {
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('get_public_vote_order_status', {
    p_public_token: token,
  })

  if (error || !data?.length) return null
  return data[0]
}

export async function getAdminVotingData() {
  const supabase = await createClient()

  const { data: edition } = await supabase
    .from('award_editions')
    .select('id,year,edition_label,status,is_public,voting_starts_at,voting_ends_at,leaderboard_visibility')
    .neq('status', 'archived')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!edition) {
    return {
      edition: null,
      pricing: null,
      counts: { total: 0, paid: 0, pending: 0, failed: 0 },
      recentOrders: [],
    }
  }

  const [
    { data: pricing },
    { count: total },
    { count: paid },
    { count: pending },
    { count: failed },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('vote_pricing').select('*').eq('award_edition_id', edition.id).maybeSingle(),
    supabase.from('vote_orders').select('id', { count: 'exact', head: true }),
    supabase.from('vote_orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('vote_orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'payment_pending']),
    supabase.from('vote_orders').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase
      .from('vote_orders')
      .select('id,order_number,nominee_id,quantity,unit_price,total_amount,currency,status,created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const nomineeIds = [...new Set((recentOrders ?? []).map((order) => order.nominee_id))]
  let nomineeMap = new Map<string, { full_name: string; nominee_code: string }>()

  if (nomineeIds.length) {
    const { data } = await supabase
      .from('nominees')
      .select('id,full_name,nominee_code')
      .in('id', nomineeIds)

    nomineeMap = new Map(
      (data ?? []).map((nominee) => [
        nominee.id,
        { full_name: nominee.full_name, nominee_code: nominee.nominee_code },
      ]),
    )
  }

  return {
    edition,
    pricing: pricing ?? null,
    counts: {
      total: total ?? 0,
      paid: paid ?? 0,
      pending: pending ?? 0,
      failed: failed ?? 0,
    },
    recentOrders: (recentOrders ?? []).map((order) => ({
      ...order,
      nominee: nomineeMap.get(order.nominee_id) ?? null,
    })),
  }
}
