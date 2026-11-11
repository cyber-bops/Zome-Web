import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zome',
  description: 'Your Care Purse, ready when care is.',
  applicationName: 'Zome',
  appleWebApp: { capable: true, title: 'Zome', statusBarStyle: 'default' },
  manifest: '/manifest.webmanifest',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#E9E5DD' }

// One look, paper on a desk (globals.css). The filter gives the stamps their ink.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>
        <svg width="0" height="0" className="sr" aria-hidden="true">
          <filter id="ink"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" result="t" /><feDisplacementMap in="SourceGraphic" in2="t" scale="2.2" /></filter>
        </svg>
        {children}
      </body>
    </html>
  )
}
