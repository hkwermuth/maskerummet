/**
 * Tests for getCombinationsForYarn().
 *
 * Acceptkriterier dækket:
 * - Returnerer combos hvor yarnId er enten yarn_id_a eller yarn_id_b.
 * - `partner` er altid sat til den ANDEN end target.
 * - `isSameYarn` true hvis a == b.
 * - Filtrerer rækker hvor partner ikke kan slås op.
 * - Returnerer tom array på fejl (logger).
 * - Returnerer tom array når ingen combos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock createSupabasePublicClient BEFORE importing the module under test
// ---------------------------------------------------------------------------

const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/public', () => ({
  createSupabasePublicClient: () => mockSupabase,
}))

// Import after mock is registered
import { getCombinationsForYarn } from '@/lib/combinations'

// ---------------------------------------------------------------------------
// Helper to build a chainable Supabase query mock
// ---------------------------------------------------------------------------

function makeSelectChain(result: { data: unknown; error: unknown }) {
  // .select(...).or(...) → Promise
  const orFn = vi.fn(() => Promise.resolve(result))
  const selectFn = vi.fn(() => ({ or: orFn }))
  return { select: selectFn, _or: orFn }
}

function makeInChain(result: { data: unknown; error: unknown }) {
  // .select(...).in(...) → Promise
  const inFn = vi.fn(() => Promise.resolve(result))
  const selectFn = vi.fn(() => ({ in: inFn }))
  return { select: selectFn }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getCombinationsForYarn', () => {
  it('returns empty array immediately for non-UUID input (defense-in-depth)', async () => {
    const result = await getCombinationsForYarn('not-a-uuid')
    expect(result).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('returns empty array when no combinations exist', async () => {
    const comboChain = makeSelectChain({ data: [], error: null })
    mockSupabase.from.mockReturnValue(comboChain)

    const result = await getCombinationsForYarn('33333333-3333-3333-3333-333333333333')
    expect(result).toEqual([])
  })

  it('returns empty array on Supabase error (combinations query)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const comboChain = makeSelectChain({ data: null, error: { message: 'network error' } })
    mockSupabase.from.mockReturnValue(comboChain)

    const result = await getCombinationsForYarn('33333333-3333-3333-3333-333333333333')
    expect(result).toEqual([])
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('sets partner to yarn_id_b when target is yarn_id_a', async () => {
    const targetId = '11111111-1111-1111-1111-111111111111'
    const partnerId = '22222222-2222-2222-2222-222222222222'

    const combos = [
      {
        id: 'combo-1',
        yarn_id_a: targetId,
        yarn_id_b: partnerId,
        combined_needle_min_mm: 4.0,
        combined_needle_max_mm: 5.0,
        combined_gauge_stitches_10cm: 20,
        combined_thickness_category: 'dk',
        use_cases: ['tørklæde'],
        notes: 'En note',
      },
    ]
    const yarns = [
      { id: partnerId, producer: 'Isager', name: 'Silk Mohair', series: null },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'yarn_combinations') return makeSelectChain({ data: combos, error: null })
      if (table === 'yarns_full') return makeInChain({ data: yarns, error: null })
      return makeSelectChain({ data: [], error: null })
    })

    const result = await getCombinationsForYarn(targetId)
    expect(result).toHaveLength(1)
    expect(result[0].partner.id).toBe(partnerId)
    expect(result[0].partner.name).toBe('Silk Mohair')
    expect(result[0].isSameYarn).toBe(false)
  })

  it('sets partner to yarn_id_a when target is yarn_id_b', async () => {
    const targetId = '22222222-2222-2222-2222-222222222222'
    const partnerId = '11111111-1111-1111-1111-111111111111'

    const combos = [
      {
        id: 'combo-2',
        yarn_id_a: partnerId,
        yarn_id_b: targetId,
        combined_needle_min_mm: null,
        combined_needle_max_mm: null,
        combined_gauge_stitches_10cm: null,
        combined_thickness_category: null,
        use_cases: null,
        notes: null,
      },
    ]
    const yarns = [
      { id: partnerId, producer: 'Filcolana', name: 'Alva', series: null },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'yarn_combinations') return makeSelectChain({ data: combos, error: null })
      if (table === 'yarns_full') return makeInChain({ data: yarns, error: null })
      return makeSelectChain({ data: [], error: null })
    })

    const result = await getCombinationsForYarn(targetId)
    expect(result).toHaveLength(1)
    expect(result[0].partner.id).toBe(partnerId)
    expect(result[0].isSameYarn).toBe(false)
  })

  it('sets isSameYarn=true when yarn_id_a === yarn_id_b', async () => {
    const targetId = '44444444-4444-4444-4444-444444444444'

    const combos = [
      {
        id: 'combo-self',
        yarn_id_a: targetId,
        yarn_id_b: targetId,
        combined_needle_min_mm: 6.0,
        combined_needle_max_mm: 6.0,
        combined_gauge_stitches_10cm: null,
        combined_thickness_category: 'bulky',
        use_cases: ['hue'],
        notes: null,
      },
    ]
    const yarns = [
      { id: targetId, producer: 'Camarose', name: 'Lama Tweed', series: null },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'yarn_combinations') return makeSelectChain({ data: combos, error: null })
      if (table === 'yarns_full') return makeInChain({ data: yarns, error: null })
      return makeSelectChain({ data: [], error: null })
    })

    const result = await getCombinationsForYarn(targetId)
    expect(result).toHaveLength(1)
    expect(result[0].isSameYarn).toBe(true)
    expect(result[0].partner.id).toBe(targetId)
  })

  it('filters out combinations where partner yarn cannot be found in map', async () => {
    const targetId = '11111111-1111-1111-1111-111111111111'
    const partnerId = '55555555-5555-5555-5555-555555555555'

    const combos = [
      {
        id: 'combo-missing',
        yarn_id_a: targetId,
        yarn_id_b: partnerId,
        combined_needle_min_mm: null,
        combined_needle_max_mm: null,
        combined_gauge_stitches_10cm: null,
        combined_thickness_category: null,
        use_cases: null,
        notes: null,
      },
    ]
    // yarns_full returns empty — partner not found
    const yarns: unknown[] = []

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'yarn_combinations') return makeSelectChain({ data: combos, error: null })
      if (table === 'yarns_full') return makeInChain({ data: yarns, error: null })
      return makeSelectChain({ data: [], error: null })
    })

    const result = await getCombinationsForYarn(targetId)
    expect(result).toEqual([])
  })

  it('returns empty array on yarns_full lookup error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const targetId = '11111111-1111-1111-1111-111111111111'
    const partnerId = '22222222-2222-2222-2222-222222222222'

    const combos = [
      {
        id: 'combo-1',
        yarn_id_a: targetId,
        yarn_id_b: partnerId,
        combined_needle_min_mm: null,
        combined_needle_max_mm: null,
        combined_gauge_stitches_10cm: null,
        combined_thickness_category: null,
        use_cases: null,
        notes: null,
      },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'yarn_combinations') return makeSelectChain({ data: combos, error: null })
      if (table === 'yarns_full') return makeInChain({ data: null, error: { message: 'db error' } })
      return makeSelectChain({ data: [], error: null })
    })

    const result = await getCombinationsForYarn(targetId)
    expect(result).toEqual([])
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('correctly populates use_cases as empty array when null in db', async () => {
    const targetId = '11111111-1111-1111-1111-111111111111'
    const partnerId = '22222222-2222-2222-2222-222222222222'

    const combos = [
      {
        id: 'combo-1',
        yarn_id_a: targetId,
        yarn_id_b: partnerId,
        combined_needle_min_mm: null,
        combined_needle_max_mm: null,
        combined_gauge_stitches_10cm: null,
        combined_thickness_category: null,
        use_cases: null, // null in DB
        notes: null,
      },
    ]
    const yarns = [{ id: partnerId, producer: 'X', name: 'Y', series: null }]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'yarn_combinations') return makeSelectChain({ data: combos, error: null })
      if (table === 'yarns_full') return makeInChain({ data: yarns, error: null })
      return makeSelectChain({ data: [], error: null })
    })

    const result = await getCombinationsForYarn(targetId)
    expect(result[0].use_cases).toEqual([])
  })

  it('returns multiple combinations correctly', async () => {
    const targetId = '66666666-6666-6666-6666-666666666666'
    const partner1 = '77777777-7777-7777-7777-777777777777'
    const partner2 = '88888888-8888-8888-8888-888888888888'

    const combos = [
      {
        id: 'c1',
        yarn_id_a: targetId,
        yarn_id_b: partner1,
        combined_needle_min_mm: 3.5,
        combined_needle_max_mm: null,
        combined_gauge_stitches_10cm: null,
        combined_thickness_category: null,
        use_cases: ['cardigan'],
        notes: null,
      },
      {
        id: 'c2',
        yarn_id_a: partner2,
        yarn_id_b: targetId,
        combined_needle_min_mm: null,
        combined_needle_max_mm: null,
        combined_gauge_stitches_10cm: null,
        combined_thickness_category: null,
        use_cases: [],
        notes: 'Test',
      },
    ]
    const yarns = [
      { id: partner1, producer: 'A', name: 'Alpha', series: null },
      { id: partner2, producer: 'B', name: 'Beta', series: 'S2' },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'yarn_combinations') return makeSelectChain({ data: combos, error: null })
      if (table === 'yarns_full') return makeInChain({ data: yarns, error: null })
      return makeSelectChain({ data: [], error: null })
    })

    const result = await getCombinationsForYarn(targetId)
    expect(result).toHaveLength(2)
    expect(result[0].partner.id).toBe(partner1)
    expect(result[1].partner.id).toBe(partner2)
    expect(result[1].partner.series).toBe('S2')
  })
})
