import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function toNumber(value: unknown) {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function getLinkedNomineeContext() {
  const { supabase, userId } = await requirePermission(
    'nominee.portal',
    '/nominee',
  )

  const { data: nominee, error: nomineeError } =
    await supabase
      .from('nominees')
      .select(
        'id,award_edition_id,category_id,auth_user_id,nominee_code,full_name,institution,bio,photo_url,status,is_public,created_at,updated_at',
      )
      .eq('auth_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

  if (nomineeError) {
    console.error('nominee portal linked nominee', nomineeError)
    throw new Error('Unable to load your nominee profile.')
  }

  if (!nominee) {
    return {
      supabase,
      userId,
      nominee: null,
      category: null,
      edition: null,
      award: null,
      event: null,
      totalVotes: 0,
      rank: null as number | null,
    }
  }

  const [
    categoryResult,
    editionResult,
    voteSummaryResult,
  ] = await Promise.all([
    supabase
      .from('award_categories')
      .select('id,name,slug,description')
      .eq('id', nominee.category_id)
      .maybeSingle(),
    supabase
      .from('award_editions')
      .select(
        'id,award_id,year,edition_label,status,is_public,leaderboard_visibility,leaderboard_frozen_at,voting_starts_at,voting_ends_at,ceremony_event_id',
      )
      .eq('id', nominee.award_edition_id)
      .maybeSingle(),
    supabase.rpc('get_my_nominee_vote_summary'),
  ])

  if (categoryResult.error) {
    console.error(
      'nominee portal category',
      categoryResult.error,
    )
  }

  if (editionResult.error) {
    console.error(
      'nominee portal edition',
      editionResult.error,
    )
  }

  if (voteSummaryResult.error) {
    console.error(
      'nominee portal vote summary',
      voteSummaryResult.error,
    )
  }

  const category = categoryResult.data ?? null
  const edition = editionResult.data ?? null

  let award = null

  if (edition?.award_id) {
    const { data, error } = await supabase
      .from('awards')
      .select('id,slug,name,summary')
      .eq('id', edition.award_id)
      .maybeSingle()

    if (error) {
      console.error('nominee portal award', error)
    } else {
      award = data ?? null
    }
  }

  const summary = (
    voteSummaryResult.data ?? []
  ).find((row) => row.nominee_id === nominee.id)

  let rank: number | null = null

  if (
    edition &&
    edition.leaderboard_visibility !== 'hidden'
  ) {
    const { data: totals, error } = await supabase.rpc(
      'get_public_nominee_vote_totals',
      {
        p_award_edition_id: edition.id,
      },
    )

    if (error) {
      console.error('nominee portal rank', error)
    } else {
      const row = (totals ?? []).find(
        (item) => item.nominee_id === nominee.id,
      )

      rank = row
        ? toNumber(row.rank_position)
        : null
    }
  }

  let event = null

  if (edition?.ceremony_event_id) {
    const { data, error } = await supabase
      .from('events')
      .select(
        'id,award_edition_id,slug,title,summary,venue,starts_at,ends_at,status,is_public',
      )
      .eq('id', edition.ceremony_event_id)
      .maybeSingle()

    if (!error) event = data ?? null
  }

  if (!event && edition) {
    const { data, error } = await supabase
      .from('events')
      .select(
        'id,award_edition_id,slug,title,summary,venue,starts_at,ends_at,status,is_public',
      )
      .eq('award_edition_id', edition.id)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!error) event = data ?? null
  }

  return {
    supabase,
    userId,
    nominee,
    category,
    edition,
    award,
    event,
    totalVotes: summary
      ? toNumber(summary.total_votes)
      : 0,
    rank,
  }
}

export async function getMyNomineeDashboardData() {
  const data = await getLinkedNomineeContext()

  return {
    nominee: data.nominee,
    category: data.category,
    edition: data.edition,
    award: data.award,
    totalVotes: data.totalVotes,
    rank: data.rank,
    event: data.event,
  }
}

export async function getMyNomineeProfileData() {
  const data = await getLinkedNomineeContext()

  return {
    nominee: data.nominee,
    category: data.category,
    edition: data.edition,
    award: data.award,
  }
}

export async function getMyNomineeCampaignData() {
  const data = await getLinkedNomineeContext()

  if (!data.nominee || !data.edition) {
    return {
      ...data,
      campaignResources: [],
    }
  }

  const { data: campaignResources, error } =
    await data.supabase
      .from('nominee_resources')
      .select(
        'id,title,description,resource_type,original_filename,mime_type,file_size_bytes,published_at,expires_at',
      )
      .eq('award_edition_id', data.edition.id)
      .eq('resource_type', 'campaign_asset')
      .order('published_at', { ascending: false })

  if (error) {
    console.error(
      'nominee portal campaign resources',
      error,
    )
  }

  return {
    ...data,
    campaignResources: campaignResources ?? [],
  }
}

export async function getMyNomineePerformanceData() {
  const data = await getLinkedNomineeContext()

  if (!data.nominee) {
    return {
      ...data,
      daily: [],
      votesToday: 0,
      votesThisWeek: 0,
    }
  }

  const { data: dailyRows, error } =
    await data.supabase.rpc(
      'get_my_nominee_vote_performance',
      {
        p_days: 30,
      },
    )

  if (error) {
    console.error(
      'nominee portal vote performance',
      error,
    )
  }

  const daily = (dailyRows ?? []).map((row) => ({
    vote_date: row.vote_date,
    net_votes: toNumber(row.net_votes),
  }))

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const weekStart = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - 6,
    ),
  )
    .toISOString()
    .slice(0, 10)

  return {
    ...data,
    daily,
    votesToday: daily
      .filter((row) => row.vote_date === todayIso)
      .reduce((sum, row) => sum + row.net_votes, 0),
    votesThisWeek: daily
      .filter((row) => row.vote_date >= weekStart)
      .reduce((sum, row) => sum + row.net_votes, 0),
  }
}

export async function getMyNomineeAnnouncementsData() {
  const data = await getLinkedNomineeContext()

  if (!data.nominee || !data.edition) {
    return {
      ...data,
      announcements: [],
    }
  }

  const { data: announcements, error } =
    await data.supabase
      .from('nominee_announcements')
      .select(
        'id,title,body,priority,published_at,expires_at,created_at',
      )
      .eq('award_edition_id', data.edition.id)
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false })

  if (error) {
    console.error(
      'nominee portal announcements',
      error,
    )
  }

  return {
    ...data,
    announcements: announcements ?? [],
  }
}

export async function getMyNomineeResourcesData() {
  const data = await getLinkedNomineeContext()

  if (!data.nominee || !data.edition) {
    return {
      ...data,
      resources: [],
    }
  }

  const { data: resources, error } =
    await data.supabase
      .from('nominee_resources')
      .select(
        'id,title,description,resource_type,original_filename,mime_type,file_size_bytes,published_at,expires_at',
      )
      .eq('award_edition_id', data.edition.id)
      .neq('resource_type', 'campaign_asset')
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false })

  if (error) {
    console.error('nominee portal resources', error)
  }

  return {
    ...data,
    resources: resources ?? [],
  }
}

export async function getMyNomineePassData() {
  const data = await getLinkedNomineeContext()

  if (!data.nominee) {
    return {
      ...data,
      pass: null,
      ticket: null,
    }
  }

  const admin = createAdminClient()

  const { data: pass, error: passError } = await admin
    .from('nominee_ceremony_passes')
    .select(
      'id,nominee_id,event_id,ticket_id,status,issued_at,revoked_at,revoke_reason',
    )
    .eq('nominee_id', data.nominee.id)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (passError) {
    console.error('nominee portal ceremony pass', passError)
  }

  if (!pass) {
    return {
      ...data,
      pass: null,
      ticket: null,
    }
  }

  const [
    ticketResult,
    eventResult,
  ] = await Promise.all([
    admin
      .from('tickets')
      .select(
        'id,ticket_code,status,holder_name,issued_at,event_id,ticket_type_id',
      )
      .eq('id', pass.ticket_id)
      .maybeSingle(),
    admin
      .from('events')
      .select(
        'id,slug,title,venue,starts_at,ends_at,status,is_public',
      )
      .eq('id', pass.event_id)
      .maybeSingle(),
  ])

  if (ticketResult.error) {
    console.error(
      'nominee portal pass ticket',
      ticketResult.error,
    )
  }

  if (eventResult.error) {
    console.error(
      'nominee portal pass event',
      eventResult.error,
    )
  }

  return {
    ...data,
    pass,
    ticket: ticketResult.data ?? null,
    passEvent: eventResult.data ?? null,
  }
}
