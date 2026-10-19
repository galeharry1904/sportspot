import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SportSpot',
    short_name: 'SportSpot',
    description: 'Find pubs near you showing live football, check league tables, fixtures and results, and plan your matchday.',
    start_url: '/',
    display: 'standalone',
    background_color: '#121a33',
    theme_color: '#121a33',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
