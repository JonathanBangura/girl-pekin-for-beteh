import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Results',
  description: 'View officially published Girl Pikin For Betteh award results.',
  path: '/results',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
