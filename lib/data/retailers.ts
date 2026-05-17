import type { SupabaseClient } from '@supabase/supabase-js'

export type Brand = {
  id: string
  slug: string
  name: string
  origin: string | null
  website: string | null
}

export type OnlineRetailer = {
  id: string
  slug: string
  navn: string
  url: string
  beskrivelse: string | null
  land: string
  leverer_til_dk: boolean
  sidst_tjekket: string | null
  brands: Brand[]
  // Antal fysiske butikker der peger på denne webshop via stores.online_retailer_id.
  // Bruges til at vise "Også fysisk butik"-cross-badge på /online-forhandlere.
  physical_store_count: number
}

// Mærker fremhævet øverst i brand-filtre.
export const FEATURED_BRAND_SLUGS = ['drops', 'permin', 'filcolana'] as const

// Mærker der midlertidigt skjules overalt på siden (for få forhandlere, lille
// dansk tilstedeværelse). Data bliver i databasen — kan reaktiveres ved at
// fjerne slug herfra.
export const HIDDEN_BRAND_SLUGS = new Set(['hillesvag', 'holst', 'hobbii', 'novita'])

// Sortér brands så Drops, Permin, Filcolana ligger først; derefter alfabetisk.
export function orderBrands(brands: Brand[]): Brand[] {
  const featured = FEATURED_BRAND_SLUGS
    .map(slug => brands.find(b => b.slug === slug))
    .filter((b): b is Brand => Boolean(b))
  const rest = brands
    .filter(b => !FEATURED_BRAND_SLUGS.includes(b.slug as (typeof FEATURED_BRAND_SLUGS)[number]))
    .sort((a, b) => a.name.localeCompare(b.name, 'da'))
  return [...featured, ...rest]
}

type RetailerRow = {
  id: string
  slug: string
  navn: string
  url: string
  beskrivelse: string | null
  land: string
  leverer_til_dk: boolean
  sidst_tjekket: string | null
  retailer_brands: {
    brands: Brand | null
  }[] | null
}

export async function fetchOnlineRetailers(
  supabase: SupabaseClient,
): Promise<OnlineRetailer[]> {
  const { data, error } = await supabase
    .from('online_retailers')
    .select(`
      id, slug, navn, url, beskrivelse, land, leverer_til_dk, sidst_tjekket,
      retailer_brands (
        brands ( id, slug, name, origin, website )
      )
    `)
    .eq('leverer_til_dk', true)
    .order('navn', { ascending: true })
  if (error) {
    console.error('fetchOnlineRetailers', error)
    return []
  }

  // Tæl fysiske butikker pr. online_retailer_id i én ekstra query.
  // Returneres ikke aggregeret af PostgREST — vi laver mapping i memory.
  const { data: storeRows, error: storesError } = await supabase
    .from('stores')
    .select('online_retailer_id')
    .not('online_retailer_id', 'is', null)
  if (storesError) {
    console.error('fetchOnlineRetailers (count)', storesError)
  }
  const countByRetailer = new Map<string, number>()
  for (const row of (storeRows ?? []) as { online_retailer_id: string | null }[]) {
    if (!row.online_retailer_id) continue
    countByRetailer.set(row.online_retailer_id, (countByRetailer.get(row.online_retailer_id) ?? 0) + 1)
  }

  const rows = (data ?? []) as unknown as RetailerRow[]
  return rows.map(r => ({
    id: r.id,
    slug: r.slug,
    navn: r.navn,
    url: r.url,
    beskrivelse: r.beskrivelse,
    land: r.land,
    leverer_til_dk: r.leverer_til_dk,
    sidst_tjekket: r.sidst_tjekket,
    brands: (r.retailer_brands ?? [])
      .map(rb => rb.brands)
      .filter((b): b is Brand => b !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'da')),
    physical_store_count: countByRetailer.get(r.id) ?? 0,
  }))
}

export async function fetchBrands(supabase: SupabaseClient): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('id, slug, name, origin, website')
    .order('name', { ascending: true })
  if (error) {
    console.error('fetchBrands', error)
    return []
  }
  return (data ?? []) as Brand[]
}
