import type { SupabaseClient } from '@supabase/supabase-js'

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
}

export type StoreResult = StoreBase & {
  distance_km: number
}

// Henter alle butikker med lat/lng — bruges til kortet ved side-load.
export async function fetchAllStores(supabase: SupabaseClient): Promise<StoreBase[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('id,name,address,postcode,city,phone,website,lat,lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('name', { ascending: true })
  if (error) {
    console.error('fetchAllStores', error)
    return []
  }
  return (data ?? []) as StoreBase[]
}

export type SearchStoresArgs = {
  lat: number
  lng: number
  radius: number
}

// Søger butikker inden for radius via RPC. brand_slugs sendes altid som null
// (brand-filtrering er fjernet; ønsket "søg på konkret garntype" ligger i BACKLOG).
export async function searchStoresNear(
  supabase: SupabaseClient,
  { lat, lng, radius }: SearchStoresArgs,
): Promise<StoreResult[]> {
  const { data, error } = await supabase.rpc('find_stores_near', {
    search_lat: lat,
    search_lng: lng,
    radius_km: radius,
    brand_slugs: null,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as StoreResult[]
}
