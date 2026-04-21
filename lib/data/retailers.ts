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
