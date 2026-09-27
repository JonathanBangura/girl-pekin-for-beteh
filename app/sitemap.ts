import type { MetadataRoute } from 'next'
import {
  getPublishedNews,
  getPublishedPrograms,
} from '@/lib/public/cms-data'
import {
  getPublicAwardsIndex,
  getPublicNomineeDirectory,
} from '@/lib/public/live-awards-data'
import { getPublicEvents } from '@/lib/ticketing/live-data'
import { SITE_URL } from '@/lib/seo/site'

function url(path: string) {
  return new URL(path, SITE_URL).toString()
}

function safeDate(value?: string | null) {
  if (!value) return undefined

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? undefined
    : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: url('/'), changeFrequency: 'weekly', priority: 1 },
    { url: url('/about'), changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/programs'), changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/awards'), changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/apply'), changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/nominees'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/events'), changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/news'), changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/gallery'), changeFrequency: 'weekly', priority: 0.6 },
    { url: url('/partners'), changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/results'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/contact'), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const [
    programsResult,
    newsResult,
    eventsResult,
    nomineesResult,
    awardsResult,
  ] = await Promise.allSettled([
    getPublishedPrograms(),
    getPublishedNews(),
    getPublicEvents(),
    getPublicNomineeDirectory({}),
    getPublicAwardsIndex(),
  ])

  const dynamicEntries: MetadataRoute.Sitemap = []

  if (programsResult.status === 'fulfilled') {
    for (const program of programsResult.value) {
      dynamicEntries.push({
        url: url(`/programs/${program.slug}`),
        lastModified: safeDate(program.published_at),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
  }

  if (newsResult.status === 'fulfilled') {
    for (const post of newsResult.value) {
      dynamicEntries.push({
        url: url(`/news/${post.slug}`),
        lastModified: safeDate(post.published_at),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
  }

  if (eventsResult.status === 'fulfilled') {
    for (const event of eventsResult.value) {
      if (event.status !== 'published') continue

      dynamicEntries.push({
        url: url(`/events/${event.slug}`),
        lastModified: safeDate(event.starts_at),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  }

  if (nomineesResult.status === 'fulfilled') {
    for (const nominee of nomineesResult.value.nominees) {
      dynamicEntries.push({
        url: url(`/nominees/${nominee.nominee_code}`),
        changeFrequency: 'daily',
        priority: 0.8,
      })
    }
  }

  if (
    awardsResult.status === 'fulfilled' &&
    awardsResult.value?.award?.slug
  ) {
    dynamicEntries.push({
      url: url(`/awards/${awardsResult.value.award.slug}`),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  const unique = new Map<
    string,
    MetadataRoute.Sitemap[number]
  >()

  for (const entry of [
    ...staticEntries,
    ...dynamicEntries,
  ]) {
    unique.set(entry.url, entry)
  }

  return [...unique.values()]
}
