import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Awards',
  description: 'Explore Girl Pikin For Betteh awards, editions, categories, nominees and participation information.',
  path: '/awards',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
