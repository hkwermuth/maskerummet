import type { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toSlug } from '@/lib/slug'
import type { Yarn } from '@/lib/types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maskerummet.vercel.app'
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('yarns_full').select('*')
  const yarns = (data ?? []) as Yarn[]

  return [
    { url: `${base}/garn`, changeFrequency: 'daily', priority: 1 },
    ...yarns.map((y) => ({
      url: `${base}/garn/${toSlug(y.producer, y.name, y.series)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
