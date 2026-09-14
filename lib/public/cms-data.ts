import { createPublicClient } from '@/lib/supabase/public'
import { getPublicAwardsIndex } from '@/lib/public/live-awards-data'

export type SitePageKey = 'home' | 'about' | 'contact'

export async function getPublishedSitePage(
  pageKey: SitePageKey,
) {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('site_pages')
    .select(
      'id,page_key,eyebrow,title,summary,body,secondary_body,cta_label,cta_href,published_at',
    )
    .eq('page_key', pageKey)
    .maybeSingle()

  if (error) {
    console.error(`public site page ${pageKey}`, error)
  }

  return data ?? null
}

export async function getPublishedPrograms() {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('programs')
    .select(
      'id,slug,title,summary,body,cover_image_url,published_at,sort_order',
    )
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })

  if (error) {
    console.error('public programs', error)
  }

  return data ?? []
}

export async function getPublishedProgramBySlug(
  slug: string,
) {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('programs')
    .select(
      'id,slug,title,summary,body,cover_image_url,published_at,sort_order',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('public program detail', error)
  }

  return data ?? null
}

export async function getPublishedNews() {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('news_posts')
    .select(
      'id,slug,title,excerpt,body,cover_image_url,published_at,sort_order',
    )
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })

  if (error) {
    console.error('public news', error)
  }

  return data ?? []
}

export async function getPublishedNewsBySlug(
  slug: string,
) {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('news_posts')
    .select(
      'id,slug,title,excerpt,body,cover_image_url,published_at,sort_order',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('public news detail', error)
  }

  return data ?? null
}

export async function getPublishedGallery() {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('gallery_items')
    .select(
      'id,title,caption,image_url,published_at,sort_order',
    )
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })

  if (error) {
    console.error('public gallery', error)
  }

  return data ?? []
}

export async function getPublishedPartners() {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('partners')
    .select(
      'id,name,partner_type,description,logo_url,website_url,sort_order',
    )
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('public partners', error)
  }

  return data ?? []
}

export async function getPublicSiteSettings() {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('site_settings')
    .select(
      'contact_email,contact_phone,contact_address,instagram_url,facebook_url,x_url,updated_at',
    )
    .eq('singleton', true)
    .maybeSingle()

  if (error) {
    console.error('public site settings', error)
  }

  return data ?? null
}

export async function getPublicHomeData() {
  const [
    page,
    programs,
    news,
    partners,
    award,
  ] = await Promise.all([
    getPublishedSitePage('home'),
    getPublishedPrograms(),
    getPublishedNews(),
    getPublishedPartners(),
    getPublicAwardsIndex(),
  ])

  return {
    page,
    programs: programs.slice(0, 3),
    news: news.slice(0, 3),
    partners: partners.slice(0, 8),
    award,
  }
}
