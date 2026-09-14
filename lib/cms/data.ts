import { requireAuthenticated } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

export async function requireContentManager(
  path = '/admin/content',
) {
  const auth = await requireAuthenticated(path)

  const { data } = await auth.supabase.rpc(
    'has_permission',
    {
      requested_permission_code: 'content.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    },
  )

  if (data !== true) {
    const { redirect } = await import('next/navigation')
    redirect('/unauthorized')
  }

  return auth
}

export async function requireProgramsManager(
  path = '/admin/programs',
) {
  const auth = await requireAuthenticated(path)

  const [
    { data: programsManage },
    { data: contentManage },
  ] = await Promise.all([
    auth.supabase.rpc('has_permission', {
      requested_permission_code: 'programs.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    }),
    auth.supabase.rpc('has_permission', {
      requested_permission_code: 'content.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    }),
  ])

  if (
    programsManage !== true &&
    contentManage !== true
  ) {
    const { redirect } = await import('next/navigation')
    redirect('/unauthorized')
  }

  return auth
}

export async function getContentManagementData() {
  await requireContentManager()
  const admin = createAdminClient()

  const [
    pagesResult,
    settingsResult,
    newsResult,
    galleryResult,
    partnersResult,
    contactResult,
  ] = await Promise.all([
    admin
      .from('site_pages')
      .select('*')
      .order('page_key', { ascending: true }),
    admin
      .from('site_settings')
      .select('*')
      .eq('singleton', true)
      .maybeSingle(),
    admin
      .from('news_posts')
      .select('*')
      .order('created_at', { ascending: false }),
    admin
      .from('gallery_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    admin
      .from('partners')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    admin
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  for (const [label, result] of [
    ['site pages', pagesResult],
    ['news', newsResult],
    ['gallery', galleryResult],
    ['partners', partnersResult],
    ['contact submissions', contactResult],
  ] as const) {
    if (result.error) {
      console.error(`cms ${label}`, result.error)
      throw new Error(`Unable to load ${label}.`)
    }
  }

  if (settingsResult.error) {
    console.error('cms site settings', settingsResult.error)
  }

  return {
    pages: pagesResult.data ?? [],
    settings: settingsResult.data ?? null,
    news: newsResult.data ?? [],
    gallery: galleryResult.data ?? [],
    partners: partnersResult.data ?? [],
    contacts: contactResult.data ?? [],
  }
}

export async function getProgramsManagementData() {
  await requireProgramsManager()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('programs')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('program management data', error)
    throw new Error('Unable to load programs.')
  }

  return {
    programs: data ?? [],
  }
}
