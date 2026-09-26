import { createPublicClient } from '@/lib/supabase/public'

export type PublicApplicationCategory = {
  id: string
  name: string
  description: string | null
  award_edition_id: string
  edition_label: string
  year: number
  award_name: string
}

export async function getPublicNominationOptions() {
  const supabase = createPublicClient()

  const { data: editions, error: editionError } =
    await supabase
      .from('award_editions')
      .select(
        'id,award_id,year,edition_label,status,is_public',
      )
      .eq('status', 'nominations_open')
      .eq('is_public', true)
      .order('year', { ascending: false })

  if (editionError) {
    console.error(
      'public nomination editions',
      editionError,
    )
    return {
      editions: [],
      categories: [] as PublicApplicationCategory[],
    }
  }

  if (!editions?.length) {
    return {
      editions: [],
      categories: [] as PublicApplicationCategory[],
    }
  }

  const editionIds = editions.map((edition) => edition.id)
  const awardIds = [
    ...new Set(editions.map((edition) => edition.award_id)),
  ]

  const [
    { data: awards, error: awardError },
    { data: categories, error: categoryError },
  ] = await Promise.all([
    supabase
      .from('awards')
      .select('id,name')
      .in('id', awardIds),
    supabase
      .from('award_categories')
      .select(
        'id,award_edition_id,name,description,sort_order,is_active,is_public',
      )
      .in('award_edition_id', editionIds)
      .eq('is_active', true)
      .eq('is_public', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ])

  if (awardError || categoryError) {
    console.error(
      'public nomination options',
      awardError || categoryError,
    )
    return {
      editions: [],
      categories: [] as PublicApplicationCategory[],
    }
  }

  const awardMap = new Map(
    (awards ?? []).map((award) => [
      award.id,
      award.name,
    ]),
  )

  const editionMap = new Map(
    editions.map((edition) => [
      edition.id,
      {
        ...edition,
        award_name:
          awardMap.get(edition.award_id) ?? 'Award',
      },
    ]),
  )

  const publicCategories: PublicApplicationCategory[] =
    (categories ?? []).flatMap((category) => {
      const edition = editionMap.get(
        category.award_edition_id,
      )

      if (!edition) return []

      return [
        {
          id: category.id,
          name: category.name,
          description: category.description,
          award_edition_id: edition.id,
          edition_label: edition.edition_label,
          year: edition.year,
          award_name: edition.award_name,
        },
      ]
    })

  return {
    editions: [...editionMap.values()],
    categories: publicCategories,
  }
}
