import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'About',
  description: 'Learn about Girl Pikin For Betteh Foundation, its mission, work and public programmes in Sierra Leone.',
  path: '/about',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
