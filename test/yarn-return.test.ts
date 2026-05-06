/**
 * Unit tests for lib/yarn-return.ts
 * Covers: AC-5, AC-7, AC-8, AC-9, AC-10, AC-11
 *         AC-B2.1, AC-B2.2, AC-B2.3 (metadata-arvelighed i INSERT-gren)
 *         AC-B3.7 (consolidateOnStockDuplicates kaldes efter merge + INSERT)
 *
 * All Supabase calls are mocked — no real DB hit.
 *
 * Mock-strategi: tabel-routing mock der bruger en per-table callIndex-tæller
 * i stedet for fromCallCount — mere robust over for nye kald i midten.
 */

import { describe, it, expect, vi } from 'vitest'
import { findYarnItemMatch, returnYarnLinesToStash } from '@/lib/yarn-return'
import type { ReturnableLine } from '@/lib/yarn-return'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLine(overrides: Partial<ReturnableLine> = {}): ReturnableLine {
  return {
    yarnUsageId: 'usage-1',
    yarnItemId: null,
    yarnName: 'Hannah',
    yarnBrand: 'Permin',
    colorName: 'Blå',
    colorCode: '88301',
    hex: '#4A90D9',
    quantityUsed: 2,
    catalogYarnId: null,
    catalogColorId: null,
    ...overrides,
  }
}

const YARN_ROW = {
  id: 'yarn-1',
  quantity: 3,
  name: 'Hannah',
  brand: 'Permin',
  color_name: 'Blå',
  color_code: '88301',
  hex_color: '#4A90D9',
  status: 'På lager',
}

/** Build a chainable Supabase mock that returns `resolveValue` from maybeSingle/limit */
function buildSelectChain(resolveValue: { data: unknown; error: null }) {
  const chain: Record<string, unknown> = {}
  const leaf = vi.fn().mockResolvedValue(resolveValue)
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.neq = vi.fn(() => chain)
  chain.ilike = vi.fn(() => chain)
  chain.limit = vi.fn(() => resolveValue as unknown) // limit returns data directly
  chain.maybeSingle = leaf
  return chain
}

/**
 * Byg en chainable builder der kan awaites og returnerer `result`.
 * Alle chain-metoder returnerer sig selv. Selve builderen awaites via `then`.
 */
type TerminalResult = { data: unknown; error: unknown }
function makeChainBuilder(result: TerminalResult) {
  const b: Record<string, unknown> = {
    select:      vi.fn(() => b),
    eq:          vi.fn(() => b),
    neq:         vi.fn(() => b),
    in:          vi.fn(() => b),
    is:          vi.fn(() => b),
    ilike:       vi.fn(() => b),
    gte:         vi.fn(() => b),
    limit:       vi.fn(() => result),           // limit terminerer med data direkte
    update:      vi.fn(() => b),
    insert:      vi.fn(() => b),
    delete:      vi.fn(() => b),
    single:      vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then:        (ok: (r: TerminalResult) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(ok, rej),
  }
  return b
}

/**
 * En supabase-mock der router via tabel-navn. Hvert kald til `from(table)` giver
 * næste handler i per-table-køen. Når køen er opbrugt bruges fallbackHandler.
 */
function makeTableRouter(
  handlers: Record<string, Array<() => ReturnType<typeof makeChainBuilder>>>,
  fallback: () => ReturnType<typeof makeChainBuilder> = () => makeChainBuilder({ data: null, error: null }),
): { from: ReturnType<typeof vi.fn> } {
  const indices: Record<string, number> = {}
  return {
    from: vi.fn((table: string) => {
      const queue = handlers[table] ?? []
      const i = indices[table] ?? 0
      indices[table] = i + 1
      const handler = queue[i] ?? fallback
      return handler()
    }),
  }
}

// ── findYarnItemMatch ─────────────────────────────────────────────────────────

describe('findYarnItemMatch – by-yarn-item-id', () => {
  it('returnerer match med matchKind=by-yarn-item-id når yarn_item_id rammer en række', async () => {
    const chain = buildSelectChain({ data: YARN_ROW, error: null })
    const supabase = { from: vi.fn(() => chain) } as never

    const line = makeLine({ yarnItemId: 'yarn-1' })
    const result = await findYarnItemMatch(supabase, 'user-1', line)

    expect(result).not.toBeNull()
    expect(result!.matchKind).toBe('by-yarn-item-id')
    expect(result!.yarnItemId).toBe('yarn-1')
    expect(result!.currentQuantity).toBe(3)
  })

  it('falder tilbage til catalog_color_id match når yarn_item_id-target er slettet (race)', async () => {
    const catalogRow = { ...YARN_ROW, id: 'yarn-2' }

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [catalogRow], error: null }),
        }
      }),
    } as never

    const line = makeLine({ yarnItemId: 'yarn-1', catalogColorId: 'cat-color-1' })
    const result = await findYarnItemMatch(supabase, 'user-1', line)

    expect(result).not.toBeNull()
    expect(result!.matchKind).toBe('by-catalog-color')
    expect(result!.yarnItemId).toBe('yarn-2')
  })
})

describe('findYarnItemMatch – by-catalog-color', () => {
  it('returnerer match med matchKind=by-catalog-color når catalogColorId matcher', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [YARN_ROW], error: null }),
      })),
    } as never

    const line = makeLine({ catalogColorId: 'cat-color-1' })
    const result = await findYarnItemMatch(supabase, 'user-1', line)

    expect(result!.matchKind).toBe('by-catalog-color')
  })

  it('springer "Brugt op"-rækker over ved catalog_color_id-søgning', async () => {
    const neqFn = vi.fn().mockReturnThis()
    const limitFn = vi.fn().mockResolvedValue({ data: [], error: null })
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: neqFn.mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: limitFn,
      })),
    } as never

    const line = makeLine({ yarnItemId: null, catalogColorId: 'cat-color-1' })
    await findYarnItemMatch(supabase, 'user-1', line)

    expect(neqFn).toHaveBeenCalledWith('status', 'Brugt op')
  })
})

describe('findYarnItemMatch – by-name-color fallback', () => {
  it('returnerer match med matchKind=by-name-color via ilike på brand+colorName+colorCode', async () => {
    const ilikeFn = vi.fn().mockReturnThis()
    const limitFn = vi.fn().mockResolvedValue({ data: [YARN_ROW], error: null })
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        ilike: ilikeFn,
        limit: limitFn,
      })),
    } as never

    const line = makeLine({ catalogColorId: null })
    const result = await findYarnItemMatch(supabase, 'user-1', line)

    expect(result!.matchKind).toBe('by-name-color')
    expect(ilikeFn).toHaveBeenCalledWith('brand', 'Permin')
    expect(ilikeFn).toHaveBeenCalledWith('color_name', 'Blå')
    expect(ilikeFn).toHaveBeenCalledWith('color_code', '88301')
  })

  it('returnerer null (ingen match) når intet matcher', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as never

    const line = makeLine({ catalogColorId: null })
    const result = await findYarnItemMatch(supabase, 'user-1', line)

    expect(result).toBeNull()
  })

  it('hopper name-color-fallback over når et af de tre felter er tomt på source', async () => {
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    } as never

    const line = makeLine({ catalogColorId: null, colorCode: '' })
    const result = await findYarnItemMatch(supabase, 'user-1', line)

    expect(result).toBeNull()
    expect(callCount).toBe(0)
  })
})

// ── returnYarnLinesToStash ────────────────────────────────────────────────────
//
// Ny call-rækkefølge (2026-05-06):
//   Merge-gren:
//     1. findYarnItemMatch (yarn_items select → maybeSingle)
//     2. UPDATE yarn_items
//     3. consolidateOnStockDuplicates:
//        a. yarn_items select target (maybeSingle)
//        b. yarn_items select candidates (then-termineret)
//   Insert-gren:
//     1. findYarnItemMatch (yarn_items select → limit/maybeSingle)
//     2. resolveLineMetadata: yarn_items select (maybeSingle) [kun hvis yarnItemId sat]
//     3. INSERT yarn_items → select → single
//     4. consolidateOnStockDuplicates:
//        a. yarn_items select target (maybeSingle)
//        b. yarn_items select candidates (then-termineret)

describe('returnYarnLinesToStash – auto-merge by-yarn-item-id', () => {
  it('auto-merger uden eksplicit decision når matchKind=by-yarn-item-id', async () => {
    // Forventede kald (alle yarn_items):
    //  #1: findYarnItemMatch maybeSingle → YARN_ROW
    //  #2: UPDATE → [{ id: 'yarn-1' }]
    //  #3: consolidate target lookup maybeSingle → YARN_ROW (På lager, ingen dup)
    //  #4: consolidate candidates (then) → []
    const capturedUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // #1 findYarnItemMatch
        () => {
          const b = makeChainBuilder({ data: YARN_ROW, error: null })
          return b
        },
        // #2 UPDATE
        () => {
          const updateB = makeChainBuilder({ data: [{ id: 'yarn-1' }], error: null })
          updateB.update = vi.fn((payload: unknown) => {
            capturedUpdate(payload)
            return updateB
          })
          return updateB
        },
        // #3 consolidate target
        () => makeChainBuilder({ data: YARN_ROW, error: null }),
        // #4 consolidate candidates (no duplicates)
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const line = makeLine({ yarnItemId: 'yarn-1', quantityUsed: 2 })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(capturedUpdate).toHaveBeenCalledWith(expect.objectContaining({
      quantity: 5, // 3 + 2
      status: 'På lager',
      brugt_til_projekt: null,
      brugt_op_dato: null,
    }))
    expect(summary.updated).toContain('yarn-1')
    expect(summary.created).toHaveLength(0)
  })
})

describe('returnYarnLinesToStash – kræver eksplicit merge for by-catalog-color', () => {
  it('opretter ny række (separate) når decision mangler for by-catalog-color', async () => {
    // Ingen yarnItemId → ingen resolveLineMetadata DB-kald (ingen yarnItemId på linje)
    // Kald-rækkefølge:
    //   #1: findYarnItemMatch (catalog branch, limit) → [YARN_ROW]
    //   #2: resolveLineMetadata: linje har ingen yarnItemId → intet DB-kald
    //   #3: INSERT → single → { id: 'yarn-new' }
    //   #4: consolidate target lookup → { id: 'yarn-new', status: 'På lager', ... }
    //   #5: consolidate candidates → []
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'yarn-new' }, error: null })

    const supabase = makeTableRouter({
      yarn_items: [
        // #1 findYarnItemMatch: catalog limit
        () => {
          const b = makeChainBuilder({ data: [YARN_ROW], error: null })
          return b
        },
        // #2 INSERT
        () => {
          const b = makeChainBuilder({ data: { id: 'yarn-new' }, error: null })
          b.insert = vi.fn(() => ({
            select: vi.fn(() => ({ single: insertSingleFn })),
          }))
          return b
        },
        // #3 consolidate target
        () => makeChainBuilder({ data: { id: 'yarn-new', status: 'På lager', quantity: 2, catalog_color_id: null, brand: 'Permin', color_name: 'Blå', color_code: '88301' }, error: null }),
        // #4 consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const line = makeLine({ catalogColorId: 'cat-1', quantityUsed: 2, yarnItemId: null })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(insertSingleFn).toHaveBeenCalled()
    expect(summary.created).toContain('yarn-new')
    expect(summary.updated).toHaveLength(0)
  })

  it('merger når eksplicit decision="merge" for by-catalog-color', async () => {
    // Kald:
    //   #1: findYarnItemMatch catalog limit → [YARN_ROW]
    //   #2: UPDATE → [{ id: 'yarn-1' }]
    //   #3: consolidate target → YARN_ROW
    //   #4: consolidate candidates → []
    const capturedUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // #1 findYarnItemMatch
        () => makeChainBuilder({ data: [YARN_ROW], error: null }),
        // #2 UPDATE
        () => {
          const b = makeChainBuilder({ data: [{ id: 'yarn-1' }], error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedUpdate(payload)
            return b
          })
          return b
        },
        // #3 consolidate target
        () => makeChainBuilder({ data: YARN_ROW, error: null }),
        // #4 consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const line = makeLine({ catalogColorId: 'cat-1', quantityUsed: 2, yarnItemId: null })
    const decisions = new Map([['usage-1', 'merge' as const]])
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], decisions)

    expect(capturedUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'På lager',
      brugt_til_projekt: null,
    }))
    expect(summary.updated).toContain('yarn-1')
  })
})

describe('returnYarnLinesToStash – separate', () => {
  it('opretter ny yarn_items-række ved decision="separate"', async () => {
    // Kald:
    //   #1: findYarnItemMatch catalog limit → [YARN_ROW]
    //   #2: INSERT → single → { id: 'yarn-sep' }
    //   #3: consolidate target → 'yarn-sep'-row
    //   #4: consolidate candidates → []
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'yarn-sep' }, error: null })

    const supabase = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: [YARN_ROW], error: null }),
        () => {
          const b = makeChainBuilder({ data: { id: 'yarn-sep' }, error: null })
          b.insert = vi.fn(() => ({
            select: vi.fn(() => ({ single: insertSingleFn })),
          }))
          return b
        },
        () => makeChainBuilder({ data: { id: 'yarn-sep', status: 'På lager', quantity: 2, catalog_color_id: null, brand: 'Permin', color_name: 'Blå', color_code: '88301' }, error: null }),
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const line = makeLine({ catalogColorId: 'cat-1', quantityUsed: 2, yarnItemId: null })
    const decisions = new Map([['usage-1', 'separate' as const]])
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], decisions)

    expect(insertSingleFn).toHaveBeenCalled()
    expect(summary.created).toContain('yarn-sep')
  })

  it('opretter ny yarn_items-række når intet match findes', async () => {
    // Ingen yarnItemId, ingen catalogColorId, tom colorCode → findYarnItemMatch=null
    // Ingen resolveLineMetadata DB-kald (ingen yarnItemId)
    // INSERT + consolidate (ingen duplikater)
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'yarn-new2' }, error: null })

    const supabase = makeTableRouter({
      yarn_items: [
        // INSERT
        () => {
          const b = makeChainBuilder({ data: { id: 'yarn-new2' }, error: null })
          b.insert = vi.fn(() => ({
            select: vi.fn(() => ({ single: insertSingleFn })),
          }))
          return b
        },
        // consolidate target
        () => makeChainBuilder({ data: { id: 'yarn-new2', status: 'På lager', quantity: 3, catalog_color_id: null, brand: 'Hannah', color_name: 'Blå', color_code: '' }, error: null }),
        // consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const line = makeLine({ catalogColorId: null, colorCode: '', quantityUsed: 3, yarnItemId: null })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(insertSingleFn).toHaveBeenCalled()
    expect(summary.created).toContain('yarn-new2')
  })
})

describe('returnYarnLinesToStash – nulstil brugt_til_projekt og brugt_op_dato ved merge (AC-11)', () => {
  it('update-payload har brugt_til_projekt=null, brugt_op_dato=null og status=På lager', async () => {
    const capturedUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // findYarnItemMatch
        () => makeChainBuilder({ data: YARN_ROW, error: null }),
        // UPDATE
        () => {
          const b = makeChainBuilder({ data: [{ id: 'yarn-1' }], error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedUpdate(payload)
            return b
          })
          return b
        },
        // consolidate target
        () => makeChainBuilder({ data: YARN_ROW, error: null }),
        // consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const line = makeLine({ yarnItemId: 'yarn-1', quantityUsed: 2 })
    await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(capturedUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'På lager',
      brugt_til_projekt: null,
      brugt_op_dato: null,
    }))
  })
})

describe('returnYarnLinesToStash – spring linjer over med ugyldig quantityUsed', () => {
  it.each([
    ['null', null],
    ['0', 0],
    ['negativ', -1],
  ])('springer linje over når quantityUsed er %s', async (_label, qty) => {
    const insertFn = vi.fn()
    const updateFn = vi.fn()
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: updateFn,
        insert: insertFn,
      })),
    } as never

    const line = makeLine({ quantityUsed: qty })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(insertFn).not.toHaveBeenCalled()
    expect(updateFn).not.toHaveBeenCalled()
    expect(summary.updated).toHaveLength(0)
    expect(summary.created).toHaveLength(0)
  })
})

describe('returnYarnLinesToStash – race: UPDATE rammer 0 rækker → INSERT fallback', () => {
  it('opretter ny række hvis UPDATE returnerer tomt data-array', async () => {
    // Kald-rækkefølge ved race:
    //   #1: findYarnItemMatch maybeSingle → YARN_ROW (by-yarn-item-id)
    //   #2: UPDATE → [] (race: 0 rækker opdateret)
    //   #3: resolveLineMetadata maybeSingle → metadata (yarnItemId='yarn-1')
    //   #4: INSERT → single → { id: 'yarn-fallback' }
    //   #5: consolidate target → 'yarn-fallback' row
    //   #6: consolidate candidates → []
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'yarn-fallback' }, error: null })

    const supabase = makeTableRouter({
      yarn_items: [
        // #1 findYarnItemMatch
        () => makeChainBuilder({ data: YARN_ROW, error: null }),
        // #2 UPDATE: 0 rækker (race)
        () => {
          const b = makeChainBuilder({ data: [], error: null })
          b.update = vi.fn(() => b)
          return b
        },
        // #3 resolveLineMetadata (yarnItemId='yarn-1')
        () => makeChainBuilder({ data: { image_url: null, fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }),
        // #4 INSERT
        () => {
          const b = makeChainBuilder({ data: { id: 'yarn-fallback' }, error: null })
          b.insert = vi.fn(() => ({
            select: vi.fn(() => ({ single: insertSingleFn })),
          }))
          return b
        },
        // #5 consolidate target
        () => makeChainBuilder({ data: { id: 'yarn-fallback', status: 'På lager', quantity: 2, catalog_color_id: null, brand: 'Permin', color_name: 'Blå', color_code: '88301' }, error: null }),
        // #6 consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const line = makeLine({ yarnItemId: 'yarn-1', quantityUsed: 2 })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(insertSingleFn).toHaveBeenCalled()
    expect(summary.created).toContain('yarn-fallback')
  })
})

describe('returnYarnLinesToStash – summary', () => {
  it('returnerer korrekt { updated, created } tæller ved blandede linjer', async () => {
    // lineA: yarnItemId='yarn-A' → by-yarn-item-id merge → updated
    // lineB: ingen yarnItemId, ingen catalogColorId, tom colorCode → insert → created
    //
    // Kald for lineA:
    //   yarn_items[0]: findYarnItemMatch maybeSingle → YARN_ROW med id='yarn-A'
    //   yarn_items[1]: UPDATE → [{ id: 'yarn-A' }]
    //   yarn_items[2]: consolidate target → yarn-A row
    //   yarn_items[3]: consolidate candidates → []
    // Kald for lineB (ingen match, ingen yarnItemId):
    //   yarn_items[4]: INSERT → single → { id: 'yarn-B-new' }
    //   yarn_items[5]: consolidate target → yarn-B-new row
    //   yarn_items[6]: consolidate candidates → []

    const supabase = makeTableRouter({
      yarn_items: [
        // lineA[0]: findYarnItemMatch
        () => makeChainBuilder({ data: { ...YARN_ROW, id: 'yarn-A' }, error: null }),
        // lineA[1]: UPDATE
        () => {
          const b = makeChainBuilder({ data: [{ id: 'yarn-A' }], error: null })
          b.update = vi.fn(() => b)
          return b
        },
        // lineA[2]: consolidate target
        () => makeChainBuilder({ data: { id: 'yarn-A', status: 'På lager', quantity: 5, catalog_color_id: null, brand: 'Permin', color_name: 'Blå', color_code: '88301' }, error: null }),
        // lineA[3]: consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
        // lineB[4]: INSERT
        () => {
          const b = makeChainBuilder({ data: { id: 'yarn-B-new' }, error: null })
          b.insert = vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'yarn-B-new' }, error: null }),
            })),
          }))
          return b
        },
        // lineB[5]: consolidate target
        () => makeChainBuilder({ data: { id: 'yarn-B-new', status: 'På lager', quantity: 1, catalog_color_id: null, brand: 'Hannah', color_name: 'Blå', color_code: '' }, error: null }),
        // lineB[6]: consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const lineA = makeLine({ yarnUsageId: 'usage-A', yarnItemId: 'yarn-A', quantityUsed: 2 })
    const lineB = makeLine({ yarnUsageId: 'usage-B', yarnItemId: null, catalogColorId: null, colorCode: '', quantityUsed: 1 })

    const summary = await returnYarnLinesToStash(supabase, 'user-1', [lineA, lineB], new Map())

    expect(summary.updated).toContain('yarn-A')
    expect(summary.created).toContain('yarn-B-new')
  })
})

// ── AC-B2.1: INSERT-gren kopierer metadata fra source-yarn_item (via yarnItemId) ───

describe('AC-B2.1: INSERT-gren bevarer metadata fra source-yarn_item', () => {
  it('inserter image_url/fiber/yarn_weight hentet fra source-yarn_item via yarnItemId', async () => {
    // Scenario: decision='separate', yarnItemId='yarn-src' (har metadata i DB)
    // findYarnItemMatch: catalog_color_id-søgning → ingen match
    // resolveLineMetadata: henter image_url='cat.jpg', fiber='Uld', yarn_weight='DK' fra source
    // INSERT: spreader metadata ind i payload
    const insertPayload = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // #1: findYarnItemMatch catalog limit → ingen match
        () => makeChainBuilder({ data: [], error: null }),
        // #2: resolveLineMetadata: henter metadata fra source
        () => makeChainBuilder({
          data: { image_url: 'cat.jpg', fiber: 'Uld', yarn_weight: 'DK', hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null },
          error: null,
        }),
        // #3: INSERT
        () => {
          const b = makeChainBuilder({ data: { id: 'yarn-new-meta' }, error: null })
          b.insert = vi.fn((payload: unknown) => {
            insertPayload(payload)
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'yarn-new-meta' }, error: null }),
              })),
            }
          })
          return b
        },
        // #4: consolidate target
        () => makeChainBuilder({ data: { id: 'yarn-new-meta', status: 'På lager', quantity: 2, catalog_color_id: 'cat-1', brand: null, color_name: null, color_code: null }, error: null }),
        // #5: consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    // catalogColorId sat → findYarnItemMatch prøver catalog-branch
    const line = makeLine({
      yarnItemId: 'yarn-src',
      catalogColorId: 'cat-1',
      quantityUsed: 2,
    })
    const decisions = new Map([['usage-1', 'separate' as const]])
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], decisions)

    expect(summary.created).toContain('yarn-new-meta')
    // insert-payload indeholder DB-metadata
    const payload = (insertPayload.mock.calls[0][0] as unknown[])[0] as Record<string, unknown>
    expect(payload.image_url).toBe('cat.jpg')
    expect(payload.fiber).toBe('Uld')
    expect(payload.yarn_weight).toBe('DK')
  })
})

// ── AC-B2.2: Caller-værdier vinder over DB-værdier ────────────────────────────

describe('AC-B2.2: Caller-imageUrl vinder over DB-value', () => {
  it('hvis ReturnableLine.imageUrl="abc.jpg", bruges den og DB-hent springes over for det felt', async () => {
    // Caller sætter imageUrl eksplicit — resolveLineMetadata vinder på caller-side
    // DB-metadata indeholder 'db.jpg' men caller har allerede 'abc.jpg'
    //
    // Call-rækkefølge med yarnItemId='yarn-src', catalogColorId=null, alle name-felter sat:
    //   #1: findYarnItemMatch by-yarn-item-id maybeSingle → null (slettet)
    //   #2: findYarnItemMatch name-color limit → [] (ingen match)
    //   #3: resolveLineMetadata: imageUrl er sat (image_url i explicit),
    //       henter de 8 resterende felter fra DB
    //   #4: INSERT → single → { id: 'yarn-caller-win' }
    //   #5: consolidate target
    //   #6: consolidate candidates
    const insertPayload = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // #1 findYarnItemMatch by-yarn-item-id
        () => makeChainBuilder({ data: null, error: null }),
        // #2 findYarnItemMatch name-color (ingen catalogColorId; brand+colorName+colorCode er sat)
        () => makeChainBuilder({ data: [], error: null }),
        // #3 resolveLineMetadata: henter 8 manglende felter (image_url er allerede i explicit)
        () => makeChainBuilder({
          data: { fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null },
          error: null,
        }),
        // #4 INSERT
        () => {
          const b = makeChainBuilder({ data: { id: 'yarn-caller-win' }, error: null })
          b.insert = vi.fn((payload: unknown) => {
            insertPayload(payload)
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'yarn-caller-win' }, error: null }),
              })),
            }
          })
          return b
        },
        // #5 consolidate target
        () => makeChainBuilder({ data: { id: 'yarn-caller-win', status: 'På lager', quantity: 2, catalog_color_id: null, brand: null, color_name: null, color_code: null }, error: null }),
        // #6 consolidate candidates
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    // imageUrl er sat eksplicit af caller
    const line = makeLine({
      yarnItemId: 'yarn-src',
      catalogColorId: null,
      quantityUsed: 2,
      imageUrl: 'abc.jpg',   // caller-værdi — skal vinde
    })
    await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(insertPayload).toHaveBeenCalled()
    const payload = (insertPayload.mock.calls[0][0] as unknown[])[0] as Record<string, unknown>
    expect(payload.image_url).toBe('abc.jpg')   // caller vinder
  })
})

// ── AC-B2.3: yarnItemId=null → ingen DB-fallback ──────────────────────────────

describe('AC-B2.3: yarnItemId=null → resolveLineMetadata springer DB-hent over', () => {
  it('ingen yarnItemId → ingen ekstra yarn_items-select i resolveLineMetadata', async () => {
    // Ingen yarnItemId → resolveLineMetadata returnerer kun explicit-felter
    // → kun INSERT + consolidate → 3 yarn_items-kald total (ingen resolveLineMetadata kald)
    let yarnItemsCallCount = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'yarn_items') {
          yarnItemsCallCount++
          // INSERT kald
          if (yarnItemsCallCount === 1) {
            const b = makeChainBuilder({ data: { id: 'yarn-no-meta' }, error: null })
            b.insert = vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'yarn-no-meta' }, error: null }),
              })),
            }))
            return b
          }
          // consolidate target
          if (yarnItemsCallCount === 2) {
            return makeChainBuilder({ data: { id: 'yarn-no-meta', status: 'På lager', quantity: 3, catalog_color_id: null, brand: null, color_name: null, color_code: null }, error: null })
          }
          // consolidate candidates
          return makeChainBuilder({ data: [], error: null })
        }
        throw new Error(`Uventet tabel: ${table}`)
      }),
    } as never

    // Ingen yarnItemId, ingen catalogColorId, tom colorCode → findYarnItemMatch=null (ingen DB-kald)
    const line = makeLine({
      yarnItemId: null,
      catalogColorId: null,
      colorCode: '',
      quantityUsed: 3,
    })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(summary.created).toContain('yarn-no-meta')
    // Kun 3 yarn_items kald: INSERT + consolidate target + consolidate candidates
    // (ingen resolveLineMetadata kald fordi yarnItemId=null)
    expect(yarnItemsCallCount).toBe(3)
  })
})

// ── AC-B3.7: consolidateOnStockDuplicates kaldes efter merge OG INSERT ─────────

describe('AC-B3.7: consolidateOnStockDuplicates kaldes efter merge og INSERT', () => {
  it('consolidate kaldes efter merge (målte yarn_items-kald inkluderer consolidate)', async () => {
    // Vi verificerer at consolidate target + candidates kald sker efter merge.
    // Hvis consolidate IKKE kaldtes ville supabase.from kun blive kaldt 2 gange.
    let yarnItemsCallCount = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'yarn_items') {
          yarnItemsCallCount++
          if (yarnItemsCallCount === 1) return makeChainBuilder({ data: YARN_ROW, error: null })
          if (yarnItemsCallCount === 2) {
            const b = makeChainBuilder({ data: [{ id: 'yarn-1' }], error: null })
            b.update = vi.fn(() => b)
            return b
          }
          if (yarnItemsCallCount === 3) return makeChainBuilder({ data: YARN_ROW, error: null })
          return makeChainBuilder({ data: [], error: null })
        }
        throw new Error(`Uventet tabel: ${table}`)
      }),
    } as never

    const line = makeLine({ yarnItemId: 'yarn-1', quantityUsed: 2 })
    await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    // Mindst 4 kald: findMatch + UPDATE + consolidate-target + consolidate-candidates
    expect(yarnItemsCallCount).toBeGreaterThanOrEqual(4)
  })

  it('consolidate kaldes efter INSERT (målte yarn_items-kald inkluderer consolidate)', async () => {
    let yarnItemsCallCount = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'yarn_items') {
          yarnItemsCallCount++
          if (yarnItemsCallCount === 1) {
            // INSERT
            const b = makeChainBuilder({ data: { id: 'yarn-new' }, error: null })
            b.insert = vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'yarn-new' }, error: null }),
              })),
            }))
            return b
          }
          if (yarnItemsCallCount === 2) return makeChainBuilder({ data: { id: 'yarn-new', status: 'På lager', quantity: 3, catalog_color_id: null, brand: null, color_name: null, color_code: null }, error: null })
          return makeChainBuilder({ data: [], error: null })
        }
        throw new Error(`Uventet tabel: ${table}`)
      }),
    } as never

    // Ingen yarnItemId, ingen catalogColorId, tom colorCode → ingen findMatch kald
    const line = makeLine({ yarnItemId: null, catalogColorId: null, colorCode: '', quantityUsed: 3 })
    await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    // INSERT + consolidate-target + consolidate-candidates = 3 kald
    expect(yarnItemsCallCount).toBeGreaterThanOrEqual(3)
  })
})
