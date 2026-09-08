import { createClient } from '@/lib/supabase/server'

function toNumber(value: unknown) {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getMyNomineeDashboardData() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) return null

  const { data: nominee } = await supabase
    .from('nominees')
    .select(
      'id, award_edition_id, category_id, nominee_code, full_name, institution, bio, photo_url, status, is_public',
    )
    .eq('auth_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!nominee) {
    return {
      nominee: null,
      category: null,
      edition: null,
      totalVotes: 0,
      rank: null,
      event: null,
    }
  }

  const [
    { data: category },
    { data: edition },
    { data: voteSummary },
  ] = await Promise.all([
    supabase
      .from('award_categories')
      .select('id, name, slug')
      .eq('id', nominee.category_id)
      .maybeSingle(),
    supabase
      .from('award_editions')
      .select(
        'id, year, edition_label, status, leaderboard_visibility, voting_starts_at, voting_ends_at',
      )
      .eq('id', nominee.award_edition_id)
      .maybeSingle(),
    supabase.rpc('get_my_nominee_vote_summary'),
  ])

  const summary = (voteSummary ?? []).find(
    (row) => row.nominee_id === nominee.id,
  )

  let rank: number | null = null

  if (edition && edition.leaderboard_visibility !== 'hidden') {
    const { data: totals } = await supabase.rpc(
      'get_public_nominee_vote_totals',
      { p_award_edition_id: edition.id },
    )

    const row = (totals ?? []).find(
      (item) => item.nominee_id === nominee.id,
    )

    rank = row ? toNumber(row.rank_position) : null
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, slug, title, venue, starts_at, status')
    .eq('award_edition_id', nominee.award_edition_id)
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return {
    nominee,
    category: category ?? null,
    edition: edition ?? null,
    totalVotes: summary ? toNumber(summary.total_votes) : 0,
    rank,
    event: event ?? null,
  }
}
