import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'STRIQ — Dit personlige garnunivers',
    short_name: 'STRIQ',
    description:
      'Hold styr på dit garnlager, gem dine projekter, find inspiration og prøv nye farver.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F3EE',
    theme_color: '#61846D',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
