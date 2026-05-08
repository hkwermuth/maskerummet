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
  is_strikkecafe: boolean
  // Note vises KUN på café-listningen — ikke på almindelig storefinder.
  // Hannahs krav: "Det skal lige nu kun vises når strikkebutikken har en garncafe."
  note: string | null
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
  is_strikkecafe: boolean | null
  note: string | null
  store_brands: {
    brands: StoreBrandTag | null
  }[] | null
}

const STORE_SELECT = `
  id, name, address, postcode, city, phone, website, lat, lng,
  is_strikkecafe, note,
  store_brands ( brands ( slug, name ) )
`

function mapRow(r: StoreRow): StoreBase {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    postcode: r.postcode,
    city: r.city,
    phone: r.phone,
    website: r.website,
    lat: r.lat,
    lng: r.lng,
    is_strikkecafe: r.is_strikkecafe ?? false,
    note: r.note,
    brands: (r.store_brands ?? [])
      .map(sb => sb.brands)
      .filter((b): b is StoreBrandTag => b !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'da')),
  }
}

// Henter alle butikker med lat/lng + tilknyttede mærker — bruges til kortet
// ved side-load. Brand-liste er joinet ind så klient kan filtrere uden RPC.
export async function fetchAllStores(supabase: SupabaseClient): Promise<StoreBase[]> {
  const { data, error } = await supabase
    .from('stores')
    .select(STORE_SELECT)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('name', { ascending: true })
  if (error) {
    console.error('fetchAllStores', error)
    return []
  }
  const rows = (data ?? []) as unknown as StoreRow[]
  return rows.map(mapRow)
}

// Henter kun butikker hvor is_strikkecafe=true. Bruges af /strikkecafeer-siden.
// Kører server-side så data ikke eksponeres som klient-feed (light beskyttelse
// mod scraping — ingen JSON-response-serialisering på klient-sigt).
export async function fetchStrikkecafeer(supabase: SupabaseClient): Promise<StoreBase[]> {
  const { data, error } = await supabase
    .from('stores')
    .select(STORE_SELECT)
    .eq('is_strikkecafe', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('postcode', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.error('fetchStrikkecafeer', error)
    return []
  }
  const rows = (data ?? []) as unknown as StoreRow[]
  return rows.map(mapRow)
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
