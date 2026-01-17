import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QCX - AI-powered Search & Analysis',
    short_name: 'QCX',
    description: 'A minimalistic AI-powered search tool that uses advanced models for deep analysis and geospatial data.',
    start_url: '/',
    display: 'standalone',
    background_color: '#171717',
    theme_color: '#171717',
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
        src: '/icon-1024-maskable.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/images/opengraph-image.png',
        sizes: '1200x630',
        type: 'image/png',
        label: 'QCX Home Screen',
      },
    ],
    categories: ['search', 'ai', 'productivity'],
  }
}
