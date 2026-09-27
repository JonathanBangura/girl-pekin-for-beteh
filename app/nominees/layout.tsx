import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Nominees',
  description: 'Explore published Girl Pikin For Betteh nominees, award categories and public voting information.',
  path: '/nominees',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
