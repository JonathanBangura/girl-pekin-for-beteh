import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Girl Pikin For Betteh Foundation',
  description: 'Backing girls across Sierra Leone to learn, lead and build better futures.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0f302d',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-background"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
