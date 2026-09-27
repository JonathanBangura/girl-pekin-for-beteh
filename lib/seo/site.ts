import type { Metadata } from 'next'

export const SITE_NAME = 'Girl Pikin For Betteh Foundation'
export const SITE_URL = new URL(
  'https://www.girlpikinforbetteh.org',
)
export const DEFAULT_DESCRIPTION =
  'Official programmes, awards, nominations, voting, events and public engagement platform for Girl Pikin For Betteh Foundation.'

export function absoluteSiteUrl(
  value?: string | null,
) {
  if (!value) {
    return new URL(
      '/opengraph-image',
      SITE_URL,
    ).toString()
  }

  try {
    return new URL(value, SITE_URL).toString()
  } catch {
    return new URL(
      '/opengraph-image',
      SITE_URL,
    ).toString()
  }
}

export function compactDescription(
  value: string | null | undefined,
  fallback: string,
  maxLength = 160,
) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

  const source = normalized || fallback

  if (source.length <= maxLength) {
    return source
  }

  return `${source.slice(0, maxLength - 1).trimEnd()}…`
}

export function publicMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string
  description: string
  path: string
  image?: string | null
}): Metadata {
  const canonical = absoluteSiteUrl(path)
  const socialImage = absoluteSiteUrl(
    image || '/opengraph-image',
  )
  const socialTitle =
    title === SITE_NAME
      ? title
      : `${title} | ${SITE_NAME}`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'en_SL',
      url: canonical,
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      images: [
        {
          url: socialImage,
          alt: socialTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [socialImage],
    },
  }
}

export const privateMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}
