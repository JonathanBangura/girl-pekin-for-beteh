import { createPublicClient } from '@/lib/supabase/public'
import { requireAnyAssignedPermission } from '@/lib/auth/guards'

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getPublicVoteOffer(code: string) {
  const supabase = createPublicClient()

  const { data: nominee } = await supabase
    .from('nominees')
    .select(
      'id,award_edition_id,category_id,nominee_code,full_name,institution,bio,photo_url',
    )
    .ilike('nominee_code', code)
    .maybeSingle()

  if (!nominee) return null

  const [
    { data: edition },
    { data: category },
    { data: pricing },
  ] = await Promise.all([
    supabase
      .from('award_editions')
      .select(
        'id,year,edition_label,status,is_public,voting_starts_at,voting_ends_at,leaderboard_visibility',
      )
      .eq('id', nominee.award_edition_id)
      .maybeSingle(),
    supabase
      .from('award_categories')
      .select('id,name')
      .eq('id', nominee.category_id)
      .maybeSingle(),
    supabase
      .from('vote_pricing')
      .select(
        'id,unit_price,currency,min_quantity,max_quantity,quick_quantities,is_active',
      )
      .eq(
        'award_edition_id',
        nominee.award_edition_id,
      )
      .maybeSingle(),
  ])

  if (!edition) return null

  const now = Date.now()
  const starts = edition.voting_starts_at
    ? new Date(
        edition.voting_starts_at,
      ).getTime()
    : null
  const ends = edition.voting_ends_at
    ? new Date(
        edition.voting_ends_at,
      ).getTime()
    : null

  const isOpen =
    edition.is_public === true &&
    edition.status === 'voting_open' &&
    Boolean(pricing?.is_active) &&
    (starts === null || now >= starts) &&
    (ends === null || now <= ends)

  return {
    nominee: {
      ...nominee,
      category_name:
        category?.name ?? 'Uncategorized',
    },
    edition,
    pricing: pricing
      ? {
          unit_price: toNumber(
            pricing.unit_price,
          ),
          currency: pricing.currency,
          min_quantity:
            pricing.min_quantity,
          max_quantity:
            pricing.max_quantity,
          quick_quantities:
            Array.isArray(
              pricing.quick_quantities,
            )
              ? pricing.quick_quantities
              : [],
        }
      : null,
    isOpen,
  }
}

export async function getPublicVoteOrderStatus(
  token: string,
) {
  const supabase = createPublicClient()

  const { data, error } =
    await supabase.rpc(
      'get_public_vote_order_status',
      {
        p_public_token: token,
      },
    )

  if (error || !data?.length) {
    return null
  }

  return data[0]
}

export async function getAdminVotingData(
  requestedEditionId?: string,
) {
  const { supabase } =
    await requireAnyAssignedPermission(
      'voting.manage',
      '/admin/awards/voting',
    )

  const [
    editionsResult,
    awardsResult,
  ] = await Promise.all([
    supabase
      .from('award_editions')
      .select(
        'id,award_id,year,edition_number,edition_label,status,is_public,voting_starts_at,voting_ends_at,leaderboard_visibility',
      )
      .neq('status', 'archived')
      .order('year', {
        ascending: false,
      })
      .order('edition_number', {
        ascending: false,
        nullsFirst: false,
      }),
    supabase
      .from('awards')
      .select('id,name,slug,status')
      .order('name', {
        ascending: true,
      }),
  ])

  if (editionsResult.error) {
    console.error(
      'getAdminVotingData editions',
      editionsResult.error,
    )
    throw new Error(
      'Unable to load award editions for voting management.',
    )
  }

  if (awardsResult.error) {
    console.error(
      'getAdminVotingData awards',
      awardsResult.error,
    )
    throw new Error(
      'Unable to load awards for voting management.',
    )
  }

  const awards = awardsResult.data ?? []
  const awardMap = new Map(
    awards.map((award) => [
      award.id,
      award,
    ]),
  )

  const editions = (
    editionsResult.data ?? []
  ).map((edition) => ({
    ...edition,
    award:
      awardMap.get(edition.award_id) ??
      null,
  }))

  const edition =
    editions.find(
      (item) =>
        item.id === requestedEditionId,
    ) ??
    editions.find(
      (item) =>
        item.status === 'voting_open',
    ) ??
    editions[0] ??
    null

  if (!edition) {
    return {
      awards,
      editions,
      edition: null,
      pricing: null,
      counts: {
        total: 0,
        paid: 0,
        pending: 0,
        failed: 0,
      },
      nomineeCounts: {
        total: 0,
        published: 0,
      },
      firstPublicNomineeCode: null,
      recentOrders: [],
      readiness: {
        editionPublic: false,
        lifecycleOpen: false,
        windowConfigured: false,
        windowActive: false,
        pricingConfigured: false,
        pricingActive: false,
        publishedNominees: false,
        ready: false,
      },
      canManageEdition: false,
    }
  }

  const [
    { data: pricing, error: pricingError },
    { data: nominees, error: nomineesError },
    { data: canManageEdition },
  ] = await Promise.all([
    supabase
      .from('vote_pricing')
      .select(
        'id,unit_price,currency,min_quantity,max_quantity,quick_quantities,is_active',
      )
      .eq(
        'award_edition_id',
        edition.id,
      )
      .maybeSingle(),
    supabase
      .from('nominees')
      .select(
        'id,nominee_code,full_name,status,is_public',
      )
      .eq(
        'award_edition_id',
        edition.id,
      )
      .order('created_at', {
        ascending: true,
      }),
    supabase.rpc('has_permission', {
      requested_permission_code:
        'awards.manage',
      requested_scope_type:
        'award_edition',
      requested_scope_id:
        edition.id,
    }),
  ])

  if (pricingError) {
    console.error(
      'getAdminVotingData pricing',
      pricingError,
    )
    throw new Error(
      'Unable to load voting pricing.',
    )
  }

  if (nomineesError) {
    console.error(
      'getAdminVotingData nominees',
      nomineesError,
    )
    throw new Error(
      'Unable to load voting nominees.',
    )
  }

  const nomineeRows = nominees ?? []
  const nomineeIds = nomineeRows.map(
    (nominee) => nominee.id,
  )
  const publishedNominees =
    nomineeRows.filter(
      (nominee) =>
        nominee.status === 'published' &&
        nominee.is_public === true,
    )

  let voteOrders: any[] = []

  if (nomineeIds.length) {
    const { data, error } =
      await supabase
        .from('vote_orders')
        .select(
          'id,order_number,nominee_id,quantity,unit_price,total_amount,currency,status,created_at',
        )
        .in('nominee_id', nomineeIds)
        .order('created_at', {
          ascending: false,
        })
        .limit(200)

    if (error) {
      console.error(
        'getAdminVotingData vote orders',
        error,
      )
      throw new Error(
        'Unable to load vote orders.',
      )
    }

    voteOrders = data ?? []
  }

  const nomineeMap = new Map(
    nomineeRows.map((nominee) => [
      nominee.id,
      {
        full_name: nominee.full_name,
        nominee_code:
          nominee.nominee_code,
      },
    ]),
  )

  const now = Date.now()
  const starts = edition.voting_starts_at
    ? new Date(
        edition.voting_starts_at,
      ).getTime()
    : null
  const ends = edition.voting_ends_at
    ? new Date(
        edition.voting_ends_at,
      ).getTime()
    : null

  const windowConfigured =
    starts !== null && ends !== null
  const windowActive =
    windowConfigured &&
    now >= starts &&
    now <= ends

  const readiness = {
    editionPublic:
      edition.is_public === true,
    lifecycleOpen:
      edition.status ===
      'voting_open',
    windowConfigured,
    windowActive,
    pricingConfigured:
      Boolean(pricing),
    pricingActive:
      pricing?.is_active === true,
    publishedNominees:
      publishedNominees.length > 0,
    ready: false,
  }

  readiness.ready =
    readiness.editionPublic &&
    readiness.lifecycleOpen &&
    readiness.windowConfigured &&
    readiness.windowActive &&
    readiness.pricingConfigured &&
    readiness.pricingActive &&
    readiness.publishedNominees

  return {
    awards,
    editions,
    edition,
    pricing: pricing ?? null,
    counts: {
      total: voteOrders.length,
      paid: voteOrders.filter(
        (order) =>
          order.status === 'paid',
      ).length,
      pending: voteOrders.filter(
        (order) =>
          order.status ===
            'pending' ||
          order.status ===
            'payment_pending',
      ).length,
      failed: voteOrders.filter(
        (order) =>
          order.status === 'failed',
      ).length,
    },
    nomineeCounts: {
      total: nomineeRows.length,
      published:
        publishedNominees.length,
    },
    firstPublicNomineeCode:
      publishedNominees[0]
        ?.nominee_code ?? null,
    recentOrders: voteOrders
      .slice(0, 10)
      .map((order) => ({
        ...order,
        nominee:
          nomineeMap.get(
            order.nominee_id,
          ) ?? null,
      })),
    readiness,
    canManageEdition:
      canManageEdition === true,
  }
}
