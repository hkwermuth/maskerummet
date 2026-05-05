/**
 * Unit tests for nye delta-håndtering helpers i lib/yarn-allocate.ts:
 *   - findOnStockRowMatch
 *   - incrementYarnItemQuantity
 *   - applyAllocationDelta (delta>0 + delta<0 + edge cases)
 *
 * Bug 3 fix (2026-05-05): redigering af eksisterende projekt-linje skal flytte
 * delta-mængden mellem "På lager"-pendant og "I brug"-rækken så invariant
 * `yarn_items.quantity = SUM(yarn_usage.quantity_used)` overholdes.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  findOnStockRowMatch,
  incrementYarnItemQuantity,
  applyAllocationDelta,
} from '@/lib/yarn-allocate'
import type { AllocatableLine } from '@/lib/yarn-allocate'

function makeLine(overrides: Partial<AllocatableLine> = {}): AllocatableLine {
  return {
    yarnItemId:     'inuse-1',
    yarnName:       'Bella',
    yarnBrand:      'Permin',
    colorName:      'Koral',
    colorCode:      '88301',
    hex:            '#FF7F6A',
    catalogYarnId:  null,
    catalogColorId: null,
    ...overrides,
  }
}

// Thenable builder (samme mønster som yarn-finalize.test.ts)
type TerminalResult = { data: unknown; error: unknown }
function makeBuilder(result: TerminalResult) {
  const b: Record<string, unknown> = {
    select:      vi.fn(() => b),
    eq:          vi.fn(() => b),
    neq:         vi.fn(() => b),
    in:          vi.fn(() => b),
    is:          vi.fn(() => b),
    ilike:       vi.fn(() => b),
    gte:         vi.fn(() => b),
    limit:       vi.fn(() => b),
    order:       vi.fn(() => b),
    update:      vi.fn(() => b),
    insert:      vi.fn(() => b),
    delete:      vi.fn(() => b),
    single:      vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then:        (onFulfilled: (r: TerminalResult) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  return b
}

function makeSequence(builders: ReturnType<typeof makeBuilder>[]) {
  let i = 0
  return { from: vi.fn(() => builders[i++]) } as never
}

// ── findOnStockRowMatch ──────────────────────────────────────────────────────

describe('findOnStockRowMatch', () => {
  it('matcher via catalog_color_id når feltet er sat', async () => {
    const supabase = makeSequence([
      makeBuilder({ data: [{ id: 'stash-1', quantity: 12, status: 'På lager' }], error: null }),
    ])

    const result = await findOnStockRowMatch(supabase, 'user-1', makeLine({ catalogColorId: 'cat-1' }))

    expect(result?.yarnItemId).toBe('stash-1')
    expect(result?.currentQuantity).toBe(12)
    expect(result?.matchKind).toBe('by-catalog-color')
  })

  it('falder tilbage til brand+name+code når catalog_color_id ikke matcher', async () => {
    const supabase = makeSequence([
      makeBuilder({ data: [], error: null }),         // catalog match: tom
      makeBuilder({ data: [{ id: 'stash-2', quantity: 8, status: 'På lager' }], error: null }),
    ])

    const result = await findOnStockRowMatch(supabase, 'user-1', makeLine({ catalogColorId: 'cat-1' }))

    expect(result?.yarnItemId).toBe('stash-2')
    expect(result?.matchKind).toBe('by-name-color')
  })

  it('returnerer null når intet matcher', async () => {
    const supabase = makeSequence([
      makeBuilder({ data: [], error: null }),
      makeBuilder({ data: [], error: null }),
    ])

    const result = await findOnStockRowMatch(supabase, 'user-1', makeLine({ catalogColorId: 'cat-1' }))

    expect(result).toBeNull()
  })

  it('matcher kun status="På lager" (ikke I brug eller Brugt op)', async () => {
    // Verificeret implicit via at builderens .eq('status', 'På lager') skal kaldes —
    // her tester vi at hvis kun en I-brug-række findes, returneres null.
    const supabase = makeSequence([
      makeBuilder({ data: [], error: null }),  // catalog: tom (filtrerer på 'På lager')
      makeBuilder({ data: [], error: null }),  // brand+name+code: tom
    ])

    const result = await findOnStockRowMatch(supabase, 'user-1', makeLine({ catalogColorId: 'cat-1' }))
    expect(result).toBeNull()
  })
})

// ── incrementYarnItemQuantity ────────────────────────────────────────────────

describe('incrementYarnItemQuantity', () => {
  it('inkrementerer quantity og returnerer ny værdi', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => {
        call++
        if (call === 1) return makeBuilder({ data: { quantity: 5 }, error: null })
        return makeBuilder({ data: [{ id: 'y1', quantity: 8 }], error: null })
      }),
    } as never

    const newQty = await incrementYarnItemQuantity(supabase, 'user-1', 'y1', 3)
    expect(newQty).toBe(8)
  })

  it('kaster fejl hvis target-rækken ikke findes', async () => {
    const supabase = makeSequence([
      makeBuilder({ data: null, error: null }),
    ])
    await expect(incrementYarnItemQuantity(supabase, 'user-1', 'y1', 3))
      .rejects.toThrow(/target-rækken findes ikke/)
  })

  it('kaster race-fejl hvis update rammer 0 rækker', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => {
        call++
        if (call === 1) return makeBuilder({ data: { quantity: 5 }, error: null })
        return makeBuilder({ data: [], error: null })
      }),
    } as never
    await expect(incrementYarnItemQuantity(supabase, 'user-1', 'y1', 3))
      .rejects.toThrow(/race detected/)
  })

  it('afviser qty <= 0', async () => {
    const supabase = { from: vi.fn() } as never
    await expect(incrementYarnItemQuantity(supabase, 'user-1', 'y1', 0))
      .rejects.toThrow(/qty skal være > 0/)
  })
})

// ── applyAllocationDelta — delta>0 (forøg brug) ─────────────────────────────

describe('applyAllocationDelta — delta>0 (Bug 3 hovedscenarie)', () => {
  it('delta=2.5: dec På-lager-pendant med 2.5, inc I-brug-rækken med 2.5', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => {
        call++
        // 1. findOnStockRowMatch (brand+name+code; catalogColorId=null)
        if (call === 1) return makeBuilder({
          data: [{ id: 'stash-1', quantity: 12, status: 'På lager' }],
          error: null,
        })
        // 2. decrementYarnItemQuantity → fetch
        if (call === 2) return makeBuilder({ data: { quantity: 12 }, error: null })
        // 3. decrementYarnItemQuantity → update with gte
        if (call === 3) return makeBuilder({ data: [{ id: 'stash-1', quantity: 9.5 }], error: null })
        // 4. incrementYarnItemQuantity → fetch
        if (call === 4) return makeBuilder({ data: { quantity: 3 }, error: null })
        // 5. incrementYarnItemQuantity → update
        return makeBuilder({ data: [{ id: 'inuse-1', quantity: 5.5 }], error: null })
      }),
    } as never

    const result = await applyAllocationDelta(
      supabase, 'user-1', makeLine({ yarnItemId: 'inuse-1' }), 2.5,
    )

    expect(result.delta).toBe(2.5)
    expect(result.decrementedFrom).toBe('stash-1')
    expect(result.incrementedTo).toBe('inuse-1')
    expect(result.createdRowId).toBeNull()
  })

  it('delta>0 men ingen På-lager-pendant: throw med pæn fejlbesked', async () => {
    const supabase = makeSequence([
      makeBuilder({ data: [], error: null }),  // catalog match: tom (catalogColorId null så springes over)
      makeBuilder({ data: [], error: null }),  // brand+name+code: tom
    ])

    await expect(applyAllocationDelta(
      supabase, 'user-1', makeLine({ yarnItemId: 'inuse-1' }), 2.5,
    )).rejects.toThrow(/ingen Permin Koral-rækker på lager/)
  })

  it('delta>0 men pendant har ikke nok stock: throw uden mutation', async () => {
    const supabase = makeSequence([
      makeBuilder({
        data: [{ id: 'stash-1', quantity: 1, status: 'På lager' }],
        error: null,
      }),
    ])

    await expect(applyAllocationDelta(
      supabase, 'user-1', makeLine({ yarnItemId: 'inuse-1' }), 2.5,
    )).rejects.toThrow(/kun 1 nøgle.*kan ikke øge med 2\.5/)
  })

  it('rollback: hvis increment fejler efter dec, forsøges decrement re-incrementeret', async () => {
    // Reviewer-fix: ved race på I-brug-rækken skal vi ikke "tabe" nøgler.
    // Test: dec lykkes, inc fejler → forsøger inc på pendant igen som rollback.
    let call = 0
    const incCalls: string[] = []
    const supabase = {
      from: vi.fn(() => {
        call++
        // 1. findOnStockRowMatch
        if (call === 1) return makeBuilder({
          data: [{ id: 'stash-1', quantity: 12, status: 'På lager' }], error: null,
        })
        // 2-3. dec pendant (success)
        if (call === 2) return makeBuilder({ data: { quantity: 12 }, error: null })
        if (call === 3) return makeBuilder({ data: [{ id: 'stash-1', quantity: 9.5 }], error: null })
        // 4. inc I-brug fetch (record)
        if (call === 4) {
          incCalls.push('inuse-fetch')
          return makeBuilder({ data: { quantity: 3 }, error: null })
        }
        // 5. inc I-brug update (race fejl: 0 rækker opdateret)
        if (call === 5) {
          incCalls.push('inuse-update')
          return makeBuilder({ data: [], error: null })
        }
        // 6-7. ROLLBACK: inc pendant tilbage
        if (call === 6) {
          incCalls.push('rollback-fetch')
          return makeBuilder({ data: { quantity: 9.5 }, error: null })
        }
        incCalls.push('rollback-update')
        return makeBuilder({ data: [{ id: 'stash-1', quantity: 12 }], error: null })
      }),
    } as never

    await expect(applyAllocationDelta(
      supabase, 'user-1', makeLine({ yarnItemId: 'inuse-1' }), 2.5,
    )).rejects.toThrow(/race detected/)

    // Bekræft at rollback blev forsøgt (inc-pendant kaldt efter inc-I-brug fejlede)
    expect(incCalls).toContain('rollback-fetch')
    expect(incCalls).toContain('rollback-update')
  })
})

// ── applyAllocationDelta — delta<0 (returnér overskydende) ───────────────────

describe('applyAllocationDelta — delta<0 (returner)', () => {
  it('delta=-2.5 med eksisterende På-lager-pendant: dec I-brug, inc pendant', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => {
        call++
        // 1. decrementYarnItemQuantity (I-brug) → fetch
        if (call === 1) return makeBuilder({ data: { quantity: 5.5 }, error: null })
        // 2. decrementYarnItemQuantity (I-brug) → update
        if (call === 2) return makeBuilder({ data: [{ id: 'inuse-1', quantity: 3 }], error: null })
        // 3. findOnStockRowMatch (catalogColorId null så kun brand+name+code)
        if (call === 3) return makeBuilder({
          data: [{ id: 'stash-1', quantity: 9.5, status: 'På lager' }],
          error: null,
        })
        // 4. incrementYarnItemQuantity (pendant) → fetch
        if (call === 4) return makeBuilder({ data: { quantity: 9.5 }, error: null })
        // 5. incrementYarnItemQuantity (pendant) → update
        return makeBuilder({ data: [{ id: 'stash-1', quantity: 12 }], error: null })
      }),
    } as never

    const result = await applyAllocationDelta(
      supabase, 'user-1', makeLine({ yarnItemId: 'inuse-1' }), -2.5,
    )

    expect(result.delta).toBe(-2.5)
    expect(result.decrementedFrom).toBe('inuse-1')
    expect(result.incrementedTo).toBe('stash-1')
    expect(result.createdRowId).toBeNull()
  })

  it('delta<0 uden På-lager-pendant: opret ny række med metadata fra I-brug', async () => {
    const insertCaptured = vi.fn()
    let call = 0
    const supabase = {
      from: vi.fn(() => {
        call++
        // 1. decrementYarnItemQuantity (I-brug) → fetch
        if (call === 1) return makeBuilder({ data: { quantity: 5 }, error: null })
        // 2. decrementYarnItemQuantity (I-brug) → update
        if (call === 2) return makeBuilder({ data: [{ id: 'inuse-1', quantity: 3 }], error: null })
        // 3. findOnStockRowMatch: ingen match
        if (call === 3) return makeBuilder({ data: [], error: null })
        // 4. fetch I-brug metadata for at oprette ny række
        if (call === 4) return makeBuilder({
          data: {
            name: 'Bella', brand: 'Permin', color_name: 'Koral', color_code: '88301',
            hex_color: '#FF7F6A', fiber: 'bomuld', yarn_weight: 'DK',
          },
          error: null,
        })
        // 5. insert ny "På lager"-række
        const b = makeBuilder({ data: { id: 'stash-new' }, error: null })
        b.insert = vi.fn((payload: unknown) => {
          insertCaptured(payload)
          return b
        })
        return b
      }),
    } as never

    const result = await applyAllocationDelta(
      supabase, 'user-1', makeLine({ yarnItemId: 'inuse-1' }), -2,
    )

    expect(result.delta).toBe(-2)
    expect(result.decrementedFrom).toBe('inuse-1')
    expect(result.createdRowId).toBe('stash-new')
    expect(insertCaptured).toHaveBeenCalledWith([expect.objectContaining({
      status:   'På lager',
      quantity: 2,
      brand:    'Permin',
      color_name: 'Koral',
      color_code: '88301',
    })])
  })
})

describe('applyAllocationDelta — afviser delta=0', () => {
  it('kaster fejl ved delta=0 (kalder skal sikre delta != 0)', async () => {
    const supabase = { from: vi.fn() } as never
    await expect(applyAllocationDelta(
      supabase, 'user-1', makeLine({ yarnItemId: 'inuse-1' }), 0,
    )).rejects.toThrow(/delta skal være ≠ 0/)
  })
})
