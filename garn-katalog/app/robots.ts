import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maskerummet.vercel.app'
  return {
    rules: [{ userAgent: '*', allow: '/garn' }],
    sitemap: `${base}/garn/sitemap.xml`,
  }
}
