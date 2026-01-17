import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QCX - AI-powered language to Maps',
    short_name: 'QCX',
    description: 'A minimalistic AI-powered tool that transforms language into interactive maps.',
    start_url: '/?utm_source=pwa',
    display: 'standalone',
    background_color: '#171717',
    theme_color: '#171717',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-maskable.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    categories: ['search', 'ai', 'productivity', 'maps']
  }
}
