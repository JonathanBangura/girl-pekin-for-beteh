import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'News',
  description: 'Read official news, announcements and updates from Girl Pikin For Betteh Foundation.',
  path: '/news',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
