/**
 * Unit tests for lib/yarn-return.ts
 * Covers: AC-5, AC-7, AC-8, AC-9, AC-10, AC-11
 *
 * All Supabase calls are mocked — no real DB hit.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    // First call (by-yarn-item-id): returns null → target deleted
    // Second call (by-catalog-color): returns a row
    const catalogRow = { ...YARN_ROW, id: 'yarn-2' }

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          // by-yarn-item-id lookup
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        // by-catalog-color lookup
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
    // catalog_color_id branch: select→eq(catalog_color_id)→eq(user_id)→neq(status,'Brugt op')→limit
    // No yarnItemId on this line, so only catalog branch is tried
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: neqFn.mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: limitFn,
      })),
    } as never

    // No yarnItemId → no first-branch call; catalogColorId triggers second branch
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

    const line = makeLine({ catalogColorId: null }) // no catalogColorId → skip catalog fallback
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
    // Only by-yarn-item-id and by-catalog-color branches are tried when fields are empty
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

    // colorCode is empty → name-color fallback should NOT trigger
    const line = makeLine({ catalogColorId: null, colorCode: '' })
    const result = await findYarnItemMatch(supabase, 'user-1', line)

    expect(result).toBeNull()
    // Only 1 call: no yarnItemId, no catalogColorId, no name-color (empty colorCode)
    expect(callCount).toBe(0)
  })
})

// ── returnYarnLinesToStash ────────────────────────────────────────────────────

describe('returnYarnLinesToStash – auto-merge by-yarn-item-id', () => {
  it('auto-merger uden eksplicit decision når matchKind=by-yarn-item-id', async () => {
    const updateSelectFn = vi.fn().mockResolvedValue({ data: [{ id: 'yarn-1' }], error: null })
    const updateEqUserFn = vi.fn(() => ({ select: updateSelectFn }))
    const updateEqIdFn = vi.fn(() => ({ eq: updateEqUserFn }))
    const updateFn = vi.fn(() => ({ eq: updateEqIdFn }))

    let fromCallCount = 0
    const supabase = {
      from: vi.fn(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // findYarnItemMatch: by-yarn-item-id
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: YARN_ROW, error: null }),
          }
        }
        // returnYarnLinesToStash UPDATE
        return { update: updateFn }
      }),
    } as never

    const line = makeLine({ yarnItemId: 'yarn-1', quantityUsed: 2 })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
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
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'yarn-new' }, error: null })

    let fromCallCount = 0
    const supabase = {
      from: vi.fn(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // findYarnItemMatch: no yarnItemId, catalog match
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [YARN_ROW], error: null }),
          }
        }
        // INSERT branch
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: insertSingleFn,
            })),
          })),
        }
      }),
    } as never

    const line = makeLine({ catalogColorId: 'cat-1', quantityUsed: 2 })
    // No decision supplied → should treat as 'separate' since matchKind !== by-yarn-item-id
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(insertSingleFn).toHaveBeenCalled()
    expect(summary.created).toContain('yarn-new')
    expect(summary.updated).toHaveLength(0)
  })

  it('merger når eksplicit decision="merge" for by-catalog-color', async () => {
    const updateSelectFn = vi.fn().mockResolvedValue({ data: [{ id: 'yarn-1' }], error: null })
    const updateEqUserFn = vi.fn(() => ({ select: updateSelectFn }))
    const updateEqIdFn = vi.fn(() => ({ eq: updateEqUserFn }))
    const updateFn = vi.fn(() => ({ eq: updateEqIdFn }))

    let fromCallCount = 0
    const supabase = {
      from: vi.fn(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [YARN_ROW], error: null }),
          }
        }
        return { update: updateFn }
      }),
    } as never

    const line = makeLine({ catalogColorId: 'cat-1', quantityUsed: 2 })
    const decisions = new Map([['usage-1', 'merge' as const]])
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], decisions)

    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'På lager', brugt_til_projekt: null }))
    expect(summary.updated).toContain('yarn-1')
  })
})

describe('returnYarnLinesToStash – separate', () => {
  it('opretter ny yarn_items-række ved decision="separate"', async () => {
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'yarn-sep' }, error: null })

    let fromCallCount = 0
    const supabase = {
      from: vi.fn(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [YARN_ROW], error: null }),
          }
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: insertSingleFn })),
          })),
        }
      }),
    } as never

    const line = makeLine({ catalogColorId: 'cat-1', quantityUsed: 2 })
    const decisions = new Map([['usage-1', 'separate' as const]])
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], decisions)

    expect(insertSingleFn).toHaveBeenCalled()
    expect(summary.created).toContain('yarn-sep')
  })

  it('opretter ny yarn_items-række når intet match findes', async () => {
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'yarn-new2' }, error: null })

    const supabase = {
      from: vi.fn().mockImplementation(() => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: insertSingleFn })),
          })),
        }
      }),
    } as never

    const line = makeLine({ catalogColorId: null, quantityUsed: 3 })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(insertSingleFn).toHaveBeenCalled()
    expect(summary.created).toContain('yarn-new2')
  })
})

describe('returnYarnLinesToStash – nulstil brugt_til_projekt og brugt_op_dato ved merge (AC-11)', () => {
  it('update-payload har brugt_til_projekt=null, brugt_op_dato=null og status=På lager', async () => {
    const capturedUpdate = vi.fn()
    const updateSelectFn = vi.fn().mockResolvedValue({ data: [{ id: 'yarn-1' }], error: null })

    let fromCallCount = 0
    const supabase = {
      from: vi.fn(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: YARN_ROW, error: null }),
          }
        }
        return {
          update: (payload: unknown) => {
            capturedUpdate(payload)
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({ select: updateSelectFn })),
              })),
            }
          },
        }
      }),
    } as never

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
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'yarn-fallback' }, error: null })

    let fromCallCount = 0
    const supabase = {
      from: vi.fn(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // findYarnItemMatch → by-yarn-item-id
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: YARN_ROW, error: null }),
          }
        }
        if (fromCallCount === 2) {
          // UPDATE returns 0 rows → race condition
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          }
        }
        // INSERT fallback
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: insertSingleFn })),
          })),
        }
      }),
    } as never

    const line = makeLine({ yarnItemId: 'yarn-1', quantityUsed: 2 })
    const summary = await returnYarnLinesToStash(supabase, 'user-1', [line], new Map())

    expect(insertSingleFn).toHaveBeenCalled()
    expect(summary.created).toContain('yarn-fallback')
  })
})

describe('returnYarnLinesToStash – summary', () => {
  it('returnerer korrekt { updated, created } tæller ved blandede linjer', async () => {
    // lineA: yarnItemId set → by-yarn-item-id match → UPDATE → updated[]
    // lineB: no yarnItemId, no catalogColorId, empty colorCode → no match → INSERT → created[]
    let fromCallCount = 0
    const supabase = {
      from: vi.fn(() => {
        fromCallCount++
        // Call sequence:
        // 1: findYarnItemMatch for lineA (by-yarn-item-id maybeSingle)
        // 2: UPDATE yarn_items for lineA
        // 3: findYarnItemMatch for lineB (catalog branch — no catalogColorId so skipped,
        //    name-color skipped because colorCode is empty → returns null)
        // 4: INSERT yarn_items for lineB
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...YARN_ROW, id: 'yarn-A' }, error: null }),
          }
        }
        if (fromCallCount === 2) {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [{ id: 'yarn-A' }], error: null }),
                })),
              })),
            })),
          }
        }
        // fromCallCount === 3: findYarnItemMatch for lineB
        // lineB has no yarnItemId, no catalogColorId, and empty colorCode
        // → all three branches yield no query → returns null without calling from()
        // So fromCallCount === 3 is actually the INSERT call
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'yarn-B-new' }, error: null }),
            })),
          })),
        }
      }),
    } as never

    const lineA = makeLine({ yarnUsageId: 'usage-A', yarnItemId: 'yarn-A', quantityUsed: 2 })
    // All three fallback conditions absent: no yarnItemId, no catalogColorId, empty colorCode
    const lineB = makeLine({ yarnUsageId: 'usage-B', yarnItemId: null, catalogColorId: null, colorCode: '', quantityUsed: 1 })

    const summary = await returnYarnLinesToStash(supabase, 'user-1', [lineA, lineB], new Map())

    expect(summary.updated).toContain('yarn-A')
    expect(summary.created).toContain('yarn-B-new')
  })
})
