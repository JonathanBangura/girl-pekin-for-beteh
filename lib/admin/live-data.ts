import { createClient } from '@/lib/supabase/server'

function number(value: number | null | undefined) {
  return value ?? 0
}

export async function getAdminDashboardData() {
  const supabase = await createClient()

  const { data: activeEdition } = await supabase
    .from('award_editions')
    .select(
      'id, year, edition_label, status, leaderboard_visibility, voting_starts_at, voting_ends_at',
    )
    .neq('status', 'archived')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()

  const editionId = activeEdition?.id

  let publishedNomineesQuery = supabase
    .from('nominees')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  let pendingNomineesQuery = supabase
    .from('nominees')
    .select('id', { count: 'exact', head: true })
    .in('status', ['submitted', 'under_review'])

  if (editionId) {
    publishedNomineesQuery = publishedNomineesQuery.eq(
      'award_edition_id',
      editionId,
    )
    pendingNomineesQuery = pendingNomineesQuery.eq(
      'award_edition_id',
      editionId,
    )
  }

  const [
    publishedNominees,
    pendingNominees,
    voteOrders,
    ticketOrders,
    pendingPayments,
    pendingTicketOrders,
    recentAudit,
  ] = await Promise.all([
    publishedNomineesQuery,
    pendingNomineesQuery,
    supabase.from('vote_orders').select('id', { count: 'exact', head: true }),
    supabase.from('ticket_orders').select('id', { count: 'exact', head: true }),
    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']),
    supabase
      .from('ticket_orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'payment_pending']),
    supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    activeEdition: activeEdition ?? null,
    publishedNominees: number(publishedNominees.count),
    pendingNominees: number(pendingNominees.count),
    voteOrders: number(voteOrders.count),
    ticketOrders: number(ticketOrders.count),
    pendingPayments: number(pendingPayments.count),
    pendingTicketOrders: number(pendingTicketOrders.count),
    recentActivity: recentAudit.data ?? [],
  }
}

export async function getAwardsLiveData() {
  const supabase = await createClient()

  const [{ data: awards }, { data: editions }, { count: nomineeCount }] =
    await Promise.all([
      supabase
        .from('awards')
        .select('id, name, slug, status, summary, updated_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('award_editions')
        .select(
          'id, award_id, year, edition_number, edition_label, status, is_public, voting_starts_at, voting_ends_at, leaderboard_visibility, updated_at',
        )
        .order('year', { ascending: false }),
      supabase.from('nominees').select('id', { count: 'exact', head: true }),
    ])

  return {
    awards: awards ?? [],
    editions: editions ?? [],
    nomineeCount: nomineeCount ?? 0,
  }
}

export async function getCategoriesLiveData() {
  const supabase = await createClient()

  const [{ data: editions }, { data: categories }, { data: nominees }] =
    await Promise.all([
      supabase
        .from('award_editions')
        .select('id, year, edition_label, status')
        .neq('status', 'archived')
        .order('year', { ascending: false }),
      supabase
        .from('award_categories')
        .select(
          'id, award_edition_id, name, slug, description, is_public, is_active, sort_order, updated_at',
        )
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase.from('nominees').select('id, category_id'),
    ])

  const nomineeCounts = new Map<string, number>()
  for (const nominee of nominees ?? []) {
    nomineeCounts.set(
      nominee.category_id,
      (nomineeCounts.get(nominee.category_id) ?? 0) + 1,
    )
  }

  return {
    editions: editions ?? [],
    categories: (categories ?? []).map((category) => ({
      ...category,
      nominee_count: nomineeCounts.get(category.id) ?? 0,
    })),
  }
}

export async function getNomineesLiveData() {
  const supabase = await createClient()

  const [
    { data: editions },
    { data: categories },
    { data: nominees },
    { data: ledger },
  ] = await Promise.all([
    supabase
      .from('award_editions')
      .select('id, year, edition_label, status')
      .neq('status', 'archived')
      .order('year', { ascending: false }),
    supabase
      .from('award_categories')
      .select('id, award_edition_id, name, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('nominees')
      .select(
        'id, award_edition_id, category_id, nominee_code, full_name, institution, status, is_public, updated_at',
      )
      .order('created_at', { ascending: false }),
    supabase.from('vote_ledger').select('nominee_id, quantity_delta'),
  ])

  const categoryMap = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  )
  const totals = new Map<string, number>()

  for (const entry of ledger ?? []) {
    totals.set(
      entry.nominee_id,
      (totals.get(entry.nominee_id) ?? 0) + entry.quantity_delta,
    )
  }

  return {
    editions: editions ?? [],
    categories: categories ?? [],
    nominees: (nominees ?? []).map((nominee) => ({
      ...nominee,
      category_name: categoryMap.get(nominee.category_id) ?? '—',
      total_votes: totals.get(nominee.id) ?? 0,
    })),
  }
}
