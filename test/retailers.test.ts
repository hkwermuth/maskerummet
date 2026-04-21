import { describe, it, expect, vi } from 'vitest'
import { fetchOnlineRetailers, fetchBrands } from '@/lib/data/retailers'
import type { Brand } from '@/lib/data/retailers'

// ---------------------------------------------------------------------------
// Hjælper til at bygge en fleksibel Supabase-mock-kæde
// ---------------------------------------------------------------------------

function makeSelectChain(resolveWith: { data: unknown; error: unknown }) {
  const terminal = {
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolveWith).then(resolve),
  }
  const orderMock = vi.fn(() => terminal)
  const eqMock = vi.fn(() => ({ order: orderMock }))
  const selectMock = vi.fn(() => ({ eq: eqMock, order: orderMock }))
  const fromMock = vi.fn(() => ({ select: selectMock }))
  return { fromMock, selectMock, eqMock, orderMock }
}

// ---------------------------------------------------------------------------
// D1: fetchOnlineRetailers — returnerer [] ved Supabase-error
// ---------------------------------------------------------------------------

describe('D1 fetchOnlineRetailers returnerer tom array ved error', () => {
  it('returnerer [] når Supabase svarer med error', async () => {
    const { fromMock } = makeSelectChain({ data: null, error: { message: 'DB error' } })
    const supabase = { from: fromMock }
    const result = await fetchOnlineRetailers(supabase as never)
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// D2: fetchOnlineRetailers — mapper nested join til flad brands[]
// ---------------------------------------------------------------------------

describe('D2 fetchOnlineRetailers mapper nested join til flad brands[]', () => {
  it('brands fra retailer_brands[].brands mappes til flad brands[] på retaileren', async () => {
    const row = {
      id: 'r-1',
      slug: 'test-shop',
      navn: 'Test Shop',
      url: 'https://test.dk',
      beskrivelse: null,
      land: 'DK',
      leverer_til_dk: true,
      sidst_tjekket: null,
      retailer_brands: [
        { brands: { id: 'b-1', slug: 'drops', name: 'Drops', origin: null, website: null } },
        { brands: { id: 'b-2', slug: 'isager', name: 'Isager', origin: 'DK', website: null } },
      ],
    }

    const { fromMock } = makeSelectChain({ data: [row], error: null })
    const supabase = { from: fromMock }
    const result = await fetchOnlineRetailers(supabase as never)

    expect(result).toHaveLength(1)
    const retailer = result[0]
    // Flad brands-liste — ikke nested retailer_brands
    expect(retailer.brands).toHaveLength(2)
    expect(retailer.brands.map((b: Brand) => b.slug)).toContain('drops')
    expect(retailer.brands.map((b: Brand) => b.slug)).toContain('isager')
    expect((retailer as unknown as Record<string, unknown>).retailer_brands).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// D3: fetchOnlineRetailers — null brands filtreres ud
// ---------------------------------------------------------------------------

describe('D3 fetchOnlineRetailers filtrerer null brands ud', () => {
  it('junction-rækker med brands=null medtages ikke i brands[]', async () => {
    const row = {
      id: 'r-2',
      slug: 'shop-2',
      navn: 'Shop 2',
      url: 'https://shop2.dk',
      beskrivelse: null,
      land: 'DK',
      leverer_til_dk: true,
      sidst_tjekket: null,
      retailer_brands: [
        { brands: { id: 'b-3', slug: 'permin', name: 'Permin', origin: null, website: null } },
        { brands: null }, // manglende brand via join
      ],
    }

    const { fromMock } = makeSelectChain({ data: [row], error: null })
    const supabase = { from: fromMock }
    const result = await fetchOnlineRetailers(supabase as never)

    expect(result[0].brands).toHaveLength(1)
    expect(result[0].brands[0].slug).toBe('permin')
  })
})

// ---------------------------------------------------------------------------
// D4: fetchBrands — returnerer [] ved error
// ---------------------------------------------------------------------------

describe('D4 fetchBrands returnerer tom array ved error', () => {
  it('returnerer [] når Supabase svarer med error', async () => {
    const orderMock = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: 'brands error' } })
    )
    const selectMock = vi.fn(() => ({ order: orderMock }))
    const supabase = { from: vi.fn(() => ({ select: selectMock })) }

    const result = await fetchBrands(supabase as never)
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// D5: Brands inde i retailer er alfabetisk sorteret
// ---------------------------------------------------------------------------

describe('D5 brands inde i retailer er alfabetisk sorteret (dansk localeCompare)', () => {
  it('brands sorteres alfabetisk uanset rækkefølge i Supabase-respons', async () => {
    const row = {
      id: 'r-3',
      slug: 'shop-3',
      navn: 'Shop 3',
      url: 'https://shop3.dk',
      beskrivelse: null,
      land: 'DK',
      leverer_til_dk: true,
      sidst_tjekket: null,
      retailer_brands: [
        { brands: { id: 'b-z', slug: 'zara-garn', name: 'Zara Garn', origin: null, website: null } },
        { brands: { id: 'b-a', slug: 'alpha', name: 'Alpha', origin: null, website: null } },
        { brands: { id: 'b-m', slug: 'midt', name: 'Midt', origin: null, website: null } },
      ],
    }

    const { fromMock } = makeSelectChain({ data: [row], error: null })
    const supabase = { from: fromMock }
    const result = await fetchOnlineRetailers(supabase as never)

    const brandNames = result[0].brands.map((b: Brand) => b.name)
    expect(brandNames).toEqual(['Alpha', 'Midt', 'Zara Garn'])
  })
})
