import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Donate',
  description:
    'Support Girl Pikin For Betteh Foundation programmes, outreach and fundraising campaigns through a secure one-time donation.',
  path: '/donate',
})

export default function DonateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
