import type { MetadataRoute } from 'next'

// Indeksering er blokeret indtil siden er klar til offentligheden.
// For at åbne for crawlere: skift til { userAgent: '*', allow: '/garn' }
// og tilføj sitemap-feltet igen.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  }
}
