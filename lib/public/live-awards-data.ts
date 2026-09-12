import { createPublicClient } from '@/lib/supabase/public'

export type PublicNominee = {
  id: string
  nominee_code: string
  full_name: string
  institution: string | null
  bio: string | null
  photo_url: string | null
  category_id: string
  category_name: string
  total_votes: number | null
  rank_position: number | null
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function loadVoteTotals(
  supabase: ReturnType<typeof createPublicClient>,
  editionId: string,
) {
  const { data } = await supabase.rpc('get_public_nominee_vote_totals', {
    p_award_edition_id: editionId,
  })

  const map = new Map<string, { total_votes: number; rank_position: number }>()

  for (const row of data ?? []) {
    map.set(row.nominee_id, {
      total_votes: toNumber(row.total_votes),
      rank_position: toNumber(row.rank_position),
    })
  }

  return map
}

async function loadPublicEditionById(
  supabase: ReturnType<typeof createPublicClient>,
  editionId: string,
) {
  const { data: edition } = await supabase
    .from('award_editions')
    .select(
      'id, award_id, year, edition_number, edition_label, theme, description, status, is_public, voting_starts_at, voting_ends_at, leaderboard_visibility, ceremony_event_id, branding',
    )
    .eq('id', editionId)
    .maybeSingle()

  if (!edition) return null

  const [{ data: award }, { data: categories }, { data: nominees }] =
    await Promise.all([
      supabase
        .from('awards')
        .select('id, slug, name, summary, description, branding')
        .eq('id', edition.award_id)
        .maybeSingle(),
      supabase
        .from('award_categories')
        .select('id, name, slug, description, sort_order')
        .eq('award_edition_id', edition.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('nominees')
        .select(
          'id, nominee_code, full_name, institution, bio, photo_url, category_id, sort_order',
        )
        .eq('award_edition_id', edition.id)
        .order('sort_order', { ascending: true })
        .order('full_name', { ascending: true }),
    ])

  if (!award) return null

  const categoryMap = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  )

  const voteTotals =
    edition.leaderboard_visibility === 'hidden'
      ? new Map()
      : await loadVoteTotals(supabase, edition.id)

  const publicNominees: PublicNominee[] = (nominees ?? []).map((nominee) => {
    const total = voteTotals.get(nominee.id)

    return {
      id: nominee.id,
      nominee_code: nominee.nominee_code,
      full_name: nominee.full_name,
      institution: nominee.institution,
      bio: nominee.bio,
      photo_url: nominee.photo_url,
      category_id: nominee.category_id,
      category_name: categoryMap.get(nominee.category_id) ?? 'Uncategorized',
      total_votes: total?.total_votes ?? null,
      rank_position: total?.rank_position ?? null,
    }
  })

  return {
    award,
    edition,
    categories: categories ?? [],
    nominees: publicNominees,
  }
}

async function loadEditionEvent(
  supabase: ReturnType<typeof createPublicClient>,
  edition: { id: string; ceremony_event_id?: string | null },
) {
  if (edition.ceremony_event_id) {
    const { data: ceremony } = await supabase
      .from('events')
      .select(
        'id, award_edition_id, slug, title, summary, description, venue, starts_at, ends_at, access_type, status, cover_image_url',
      )
      .eq('id', edition.ceremony_event_id)
      .maybeSingle()

    if (ceremony) return ceremony
  }

  const { data: event } = await supabase
    .from('events')
    .select(
      'id, award_edition_id, slug, title, summary, description, venue, starts_at, ends_at, access_type, status, cover_image_url',
    )
    .eq('award_edition_id', edition.id)
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return event ?? null
}

export async function getPublicAwardsIndex() {
  const supabase = createPublicClient()

  const { data: edition } = await supabase
    .from('award_editions')
    .select('id')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!edition) return null

  const base = await loadPublicEditionById(supabase, edition.id)
  if (!base) return null

  const event = await loadEditionEvent(supabase, base.edition)

  const { data: ticketTypes } = event
    ? await supabase
        .from('ticket_types')
        .select(
          'id, name, pricing_type, price, min_donation, currency, admissions_per_unit, sort_order',
        )
        .eq('event_id', event.id)
        .order('sort_order', { ascending: true })
    : { data: [] }

  return {
    ...base,
    event,
    ticketTypes: ticketTypes ?? [],
  }
}

export async function getPublicAwardEditionBySlug(slug: string) {
  const supabase = createPublicClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      'id, award_edition_id, slug, title, summary, description, venue, starts_at, ends_at, access_type, status, cover_image_url',
    )
    .eq('slug', slug)
    .maybeSingle()

  let editionId = event?.award_edition_id ?? null

  if (!editionId) {
    const { data: award } = await supabase
      .from('awards')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (award) {
      const { data: edition } = await supabase
        .from('award_editions')
        .select('id')
        .eq('award_id', award.id)
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle()

      editionId = edition?.id ?? null
    }
  }

  if (!editionId) return null

  const base = await loadPublicEditionById(supabase, editionId)
  if (!base) return null

  const resolvedEvent = (await loadEditionEvent(supabase, base.edition)) ?? event ?? null

  const { data: ticketTypes } = resolvedEvent
    ? await supabase
        .from('ticket_types')
        .select(
          'id, name, pricing_type, price, min_donation, currency, admissions_per_unit, sort_order',
        )
        .eq('event_id', resolvedEvent.id)
        .order('sort_order', { ascending: true })
    : { data: [] }

  return {
    ...base,
    event: resolvedEvent,
    ticketTypes: ticketTypes ?? [],
  }
}

export async function getPublicNomineeDirectory({
  query,
  category,
}: {
  query?: string
  category?: string
}) {
  const data = await getPublicAwardsIndex()

  if (!data) {
    return {
      edition: null,
      award: null,
      categories: [],
      nominees: [] as PublicNominee[],
    }
  }

  let nominees = data.nominees

  if (category) {
    const selectedCategory = data.categories.find((item) => item.slug === category)
    nominees = selectedCategory
      ? nominees.filter((nominee) => nominee.category_id === selectedCategory.id)
      : []
  }

  const normalizedQuery = query?.trim().toLowerCase()

  if (normalizedQuery) {
    nominees = nominees.filter((nominee) =>
      [
        nominee.full_name,
        nominee.nominee_code,
        nominee.institution ?? '',
        nominee.category_name,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }

  return {
    award: data.award,
    edition: data.edition,
    categories: data.categories,
    nominees,
  }
}

export async function getPublicNomineeByCode(code: string) {
  const data = await getPublicAwardsIndex()
  if (!data) return null

  return (
    data.nominees.find(
      (nominee) => nominee.nominee_code.toLowerCase() === code.toLowerCase(),
    ) ?? null
  )
}
