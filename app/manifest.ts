import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zome',
    short_name: 'Zome',
    description: 'Your Care Purse, ready when care is.',
    start_url: '/',
    display: 'standalone',
    background_color: '#EFEFEC',
    theme_color: '#EFEFEC',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
