import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAllStores, searchStoresNear } from '@/lib/data/stores'

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  }
  // Make all functions return the chain object by default (for chaining)
  for (const key of Object.keys(chain)) {
    if (typeof chain[key] === 'function' && key !== 'order') {
      ;(chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain)
    }
  }
  return chain
}

function makeSupabase(
  fromResult?: { data: unknown[] | null; error: unknown },
  rpcResult?: { data: unknown[] | null; error: unknown },
) {
  const chain = makeChain({
    order: vi.fn().mockResolvedValue(fromResult ?? { data: [], error: null }),
  })
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue(rpcResult ?? { data: [], error: null }),
    _chain: chain,
  }
}

// ---------------------------------------------------------------------------
// A1: fetchAllStores returns empty array on error
// ---------------------------------------------------------------------------

describe('A1 fetchAllStores returns [] on supabase error', () => {
  it('returns empty array and does not throw when supabase returns error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = makeSupabase({ data: null, error: { message: 'DB offline' } })

    const result = await fetchAllStores(supabase as never)

    expect(result).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith('fetchAllStores', expect.objectContaining({ message: 'DB offline' }))
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// A2: fetchAllStores filters on lat/lng and sorts by name
// ---------------------------------------------------------------------------

describe('A2 fetchAllStores filters lat/lng and sorts by name', () => {
  it('calls .not("lat","is",null)', async () => {
    const supabase = makeSupabase({ data: [], error: null })
    await fetchAllStores(supabase as never)
    expect(supabase._chain.not).toHaveBeenCalledWith('lat', 'is', null)
  })

  it('calls .not("lng","is",null)', async () => {
    const supabase = makeSupabase({ data: [], error: null })
    await fetchAllStores(supabase as never)
    expect(supabase._chain.not).toHaveBeenCalledWith('lng', 'is', null)
  })

  it('calls .order("name", { ascending: true })', async () => {
    const supabase = makeSupabase({ data: [], error: null })
    await fetchAllStores(supabase as never)
    expect(supabase._chain.order).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('returns the data array from supabase when no error', async () => {
    // StoreRow format inkluderer store_brands + online_retailers join
    const mockRows = [
      {
        id: '1', name: 'Alpaka', address: 'Vejen 1', postcode: '1000',
        city: 'Kbh', phone: null, website: null, lat: 55.7, lng: 12.5,
        is_strikkecafe: false, note: null,
        store_brands: [],
        online_retailers: null,
      },
    ]
    const supabase = makeSupabase({ data: mockRows, error: null })
    const result = await fetchAllStores(supabase as never)
    expect(result).toEqual([
      {
        id: '1', name: 'Alpaka', address: 'Vejen 1', postcode: '1000',
        city: 'Kbh', phone: null, website: null, lat: 55.7, lng: 12.5,
        is_strikkecafe: false, note: null,
        brands: [],
        online_retailer_slug: null,
      },
    ])
  })
})

// ---------------------------------------------------------------------------
// A3: searchStoresNear calls RPC with correct params including brand_slugs: null
// ---------------------------------------------------------------------------

describe('A3 searchStoresNear calls RPC with correct params', () => {
  it('calls rpc find_stores_near with search_lat, search_lng, radius_km, brand_slugs: null', async () => {
    const supabase = makeSupabase(undefined, { data: [], error: null })
    await searchStoresNear(supabase as never, { lat: 55.676, lng: 12.568, radius: 25 })

    expect(supabase.rpc).toHaveBeenCalledWith('find_stores_near', {
      search_lat: 55.676,
      search_lng: 12.568,
      radius_km: 25,
      brand_slugs: null,
    })
  })

  it('intet brandSlug → brand_slugs er null (backcompat)', async () => {
    const supabase = makeSupabase(undefined, { data: [], error: null })
    await searchStoresNear(supabase as never, { lat: 55, lng: 12, radius: 10 })

    const args = (supabase.rpc as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(Array.isArray(args.brand_slugs)).toBe(false)
    expect(args.brand_slugs).toBeNull()
  })

  it('brandSlug: "drops" → brand_slugs: ["drops"] sendes til RPC', async () => {
    const supabase = makeSupabase(undefined, { data: [], error: null })
    await searchStoresNear(supabase as never, { lat: 55.676, lng: 12.568, radius: 25, brandSlug: 'drops' })

    expect(supabase.rpc).toHaveBeenCalledWith('find_stores_near', {
      search_lat: 55.676,
      search_lng: 12.568,
      radius_km: 25,
      brand_slugs: ['drops'],
    })
  })

  it('brandSlug: null → brand_slugs: null (eksplicit null)', async () => {
    const supabase = makeSupabase(undefined, { data: [], error: null })
    await searchStoresNear(supabase as never, { lat: 55, lng: 12, radius: 10, brandSlug: null })

    const args = (supabase.rpc as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(args.brand_slugs).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// A4: searchStoresNear throws on RPC error
// ---------------------------------------------------------------------------

describe('A4 searchStoresNear throws on RPC error', () => {
  it('throws an Error with the error message from supabase', async () => {
    const supabase = makeSupabase(undefined, { data: null, error: { message: 'RPC fejl' } })
    await expect(searchStoresNear(supabase as never, { lat: 55, lng: 12, radius: 25 }))
      .rejects
      .toThrow('RPC fejl')
  })
})
