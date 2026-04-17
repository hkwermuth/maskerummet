import type { MetadataRoute } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { toSlug } from '@/lib/slug'
import type { Yarn } from '@/lib/types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maskerummet.vercel.app'
  const supabase = createSupabasePublicClient()
  const { data } = await supabase.from('yarns_full').select('*')
  const yarns = (data ?? []) as Yarn[]

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/garn`, changeFrequency: 'daily', priority: 0.9 },
    ...yarns.map((y) => ({
      url: `${base}/garn/${toSlug(y.producer, y.name, y.series)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
