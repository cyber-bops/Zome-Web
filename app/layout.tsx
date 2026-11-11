import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zome',
  description: 'Your Care Purse, ready when care is.',
  applicationName: 'Zome',
  appleWebApp: { capable: true, title: 'Zome', statusBarStyle: 'default' },
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EFEFEC' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0E10' },
  ],
}

// The look (light, dark or the system's) is a plain cookie the Profile page
// sets, read here so the first paint is already right, with no script.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const look = (await cookies()).get('zome_look')?.value
  const theme = look === 'light' || look === 'dark' ? look : undefined
  return (
    <html lang="en-NG" data-theme={theme}>
      <body>{children}</body>
    </html>
  )
}
