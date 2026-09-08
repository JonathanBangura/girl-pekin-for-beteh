import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getCategoryManagementData() {
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

export async function getNomineeManagementData() {
  const supabase = await createClient()

  const [
    { data: editions },
    { data: categories },
    { data: nominees },
    { data: ledger },
    { data: canManageUsers },
  ] = await Promise.all([
    supabase
      .from('award_editions')
      .select('id, year, edition_label, status')
      .neq('status', 'archived')
      .order('year', { ascending: false }),
    supabase
      .from('award_categories')
      .select('id, award_edition_id, name, is_active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('nominees')
      .select(
        'id, award_edition_id, category_id, auth_user_id, nominee_code, full_name, institution, bio, photo_url, status, is_public, sort_order, updated_at',
      )
      .order('created_at', { ascending: false }),
    supabase.from('vote_ledger').select('nominee_id, quantity_delta'),
    supabase.rpc('has_permission', {
      requested_permission_code: 'users.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    }),
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

  const linkedEmails = new Map<string, string>()

  if (canManageUsers === true) {
    const admin = createAdminClient()

    for (const nominee of nominees ?? []) {
      if (!nominee.auth_user_id) continue

      const { data } = await admin.auth.admin.getUserById(
        nominee.auth_user_id,
      )

      if (data?.user?.email) {
        linkedEmails.set(nominee.auth_user_id, data.user.email)
      }
    }
  }

  return {
    editions: editions ?? [],
    categories: categories ?? [],
    canManageUsers: canManageUsers === true,
    nominees: (nominees ?? []).map((nominee) => ({
      ...nominee,
      category_name: categoryMap.get(nominee.category_id) ?? '—',
      total_votes: totals.get(nominee.id) ?? 0,
      linked_email: nominee.auth_user_id
        ? linkedEmails.get(nominee.auth_user_id) ?? null
        : null,
    })),
  }
}
