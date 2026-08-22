import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Medafora - Family Medicine & Health Guardian',
    short_name: 'Medafora',
    description: 'Family Medicine, Safety & AI Health Hub Guardian',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FDFB',
    theme_color: '#2F4858',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
