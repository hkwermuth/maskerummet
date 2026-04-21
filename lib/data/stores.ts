import type { SupabaseClient } from '@supabase/supabase-js'

export type StoreBrandTag = {
  slug: string
  name: string
}

export type StoreBase = {
  id: string
  name: string
  address: string | null
  postcode: string | null
  city: string | null
  phone: string | null
  website: string | null
  lat: number
  lng: number
  brands: StoreBrandTag[]
}

export type StoreResult = Omit<StoreBase, 'brands'> & {
  distance_km: number
  // find_stores_near returnerer brands som string[] (array af slugs).
  brands: string[]
}

type StoreRow = {
  id: string
  name: string
  address: string | null
  postcode: string | null
  city: string | null
  phone: string | null
  website: string | null
  lat: number
  lng: number
  store_brands: {
    brands: StoreBrandTag | null
  }[] | null
}

// Henter alle butikker med lat/lng + tilknyttede mærker — bruges til kortet
// ved side-load. Brand-liste er joinet ind så klient kan filtrere uden RPC.
export async function fetchAllStores(supabase: SupabaseClient): Promise<StoreBase[]> {
  const { data, error } = await supabase
    .from('stores')
    .select(`
      id, name, address, postcode, city, phone, website, lat, lng,
      store_brands ( brands ( slug, name ) )
    `)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('name', { ascending: true })
  if (error) {
    console.error('fetchAllStores', error)
    return []
  }
  const rows = (data ?? []) as unknown as StoreRow[]
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    address: r.address,
    postcode: r.postcode,
    city: r.city,
    phone: r.phone,
    website: r.website,
    lat: r.lat,
    lng: r.lng,
    brands: (r.store_brands ?? [])
      .map(sb => sb.brands)
      .filter((b): b is StoreBrandTag => b !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'da')),
  }))
}

export type SearchStoresArgs = {
  lat: number
  lng: number
  radius: number
  brandSlug?: string | null
}

// Søger butikker inden for radius via RPC. brand_slugs sendes som array med
// én slug når der er et aktivt brand-filter, ellers null.
export async function searchStoresNear(
  supabase: SupabaseClient,
  { lat, lng, radius, brandSlug }: SearchStoresArgs,
): Promise<StoreResult[]> {
  const { data, error } = await supabase.rpc('find_stores_near', {
    search_lat: lat,
    search_lng: lng,
    radius_km: radius,
    brand_slugs: brandSlug ? [brandSlug] : null,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as StoreResult[]
}
