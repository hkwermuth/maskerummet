/**
 * Unit tests for lib/yarn-consolidate.ts
 *
 * Dækker AC-B3.1 til AC-B3.6:
 *   AC-B3.1: Konsolidering via catalog_color_id-match
 *   AC-B3.2: Identity-match via (brand, color_name, color_code) ILIKE
 *   AC-B3.3: Backfill: target's NULL-felter populeres fra duplikat
 *   AC-B3.4: Idempotent — anden invokation er no-op
 *   AC-B3.5: No-op hvis target har anden status end 'På lager'
 *   AC-B3.6: No-op hvis target ikke findes
 *
 * Alle Supabase-kald er mocket — ingen rigtig DB-hit.
 *
 * Mock-strategi: tabel-routing med per-table callIndex-kø.
 * Kald-rækkefølge i consolidateOnStockDuplicates:
 *   1. yarn_items: target lookup (maybeSingle)
 *   2. yarn_items: candidates (then-termineret)
 *   [hvis duplikater fundet:]
 *   3. yarn_usage: redirect update (then-termineret)
 *   4. yarn_items: update target quantity + backfill (then-termineret)
 *   5. yarn_items: delete duplikater (then-termineret)
 */

import { describe, it, expect, vi } from 'vitest'
import { consolidateOnStockDuplicates } from '@/lib/yarn-consolidate'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    limit:       vi.fn(() => result),
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
 * Byg supabase-mock med tabel-routing og per-table kald-kø.
 * Hvert kald til from(table) forbruger næste handler i køen.
 */
function makeTableRouter(
  handlers: Record<string, Array<() => ReturnType<typeof makeChainBuilder>>>,
  fallback: () => ReturnType<typeof makeChainBuilder> = () => makeChainBuilder({ data: null, error: null }),
) {
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

// Et fuldt yarn_items-target-objekt med catalog_color_id og metadata
function makeTargetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'target-1',
    status: 'På lager',
    quantity: 5,
    catalog_color_id: 'color-123',
    brand: 'Permin',
    color_name: 'Koral',
    color_code: '88301',
    image_url: null,
    fiber: null,
    yarn_weight: null,
    hex_color: null,
    hex_colors: null,
    gauge: null,
    meters: null,
    notes: null,
    color_category: null,
    catalog_image_url: null,
    brugt_til_projekt_id: null,
    ...overrides,
  }
}

function makeDuplicateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dup-1',
    status: 'På lager',
    quantity: 3,
    catalog_color_id: 'color-123',
    brand: 'Permin',
    color_name: 'Koral',
    color_code: '88301',
    image_url: null,
    fiber: null,
    yarn_weight: null,
    hex_color: null,
    hex_colors: null,
    gauge: null,
    meters: null,
    notes: null,
    color_category: null,
    catalog_image_url: null,
    brugt_til_projekt_id: null,
    ...overrides,
  }
}

// ── AC-B3.6: No-op hvis target ikke findes ────────────────────────────────────

describe('AC-B3.6: no-op hvis target ikke findes', () => {
  it('returnerer { mergedInto: targetId, deletedIds: [], totalQty: 0 } når target er slettet', async () => {
    const supabase = makeTableRouter({
      yarn_items: [
        // target lookup: ikke fundet
        () => makeChainBuilder({ data: null, error: null }),
      ],
    }) as never

    const result = await consolidateOnStockDuplicates(supabase, 'user-1', 'target-gone')

    expect(result.mergedInto).toBe('target-gone')
    expect(result.deletedIds).toHaveLength(0)
    expect(result.totalQty).toBe(0)
    // Ingen yderligere kald
    expect((supabase as { from: ReturnType<typeof vi.fn> }).from).toHaveBeenCalledTimes(1)
  })
})

// ── AC-B3.5: No-op hvis target har anden status end 'På lager' ────────────────

describe('AC-B3.5: no-op hvis target status ≠ "På lager"', () => {
  it.each([
    ['I brug', 'I brug'],
    ['Brugt op', 'Brugt op'],
    ['Ønskeliste', 'Ønskeliste'],
  ])('status="%s" giver no-op', async (_label, status) => {
    const supabase = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: makeTargetRow({ status, quantity: 4 }), error: null }),
      ],
    }) as never

    const result = await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    expect(result.mergedInto).toBe('target-1')
    expect(result.deletedIds).toHaveLength(0)
    // Ingen candidates-søgning
    expect((supabase as { from: ReturnType<typeof vi.fn> }).from).toHaveBeenCalledTimes(1)
  })
})

// ── AC-B3.4: Idempotent — ingen duplikater = no-op ───────────────────────────

describe('AC-B3.4: idempotent — anden invokation er no-op', () => {
  it('ingen candidates fundet → no-op, deletedIds=[]', async () => {
    const supabase = makeTableRouter({
      yarn_items: [
        // target lookup
        () => makeChainBuilder({ data: makeTargetRow(), error: null }),
        // candidates: ingen duplikater
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const result = await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    expect(result.mergedInto).toBe('target-1')
    expect(result.deletedIds).toHaveLength(0)
    expect(result.totalQty).toBe(5)
    // Kun 2 kald (target + candidates)
    expect((supabase as { from: ReturnType<typeof vi.fn> }).from).toHaveBeenCalledTimes(2)
  })

  it('kald to gange: anden gang finder ingen duplikater fordi første gang slettede dem', async () => {
    // Første kald: finder og sletter duplikat
    // Anden kald: finder ingen duplikater → no-op
    // Vi simulerer begge kald med separate supabase-instanser

    // Første kald
    const capturedDelete = vi.fn()
    const supabase1 = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: makeTargetRow(), error: null }),
        () => makeChainBuilder({ data: [makeDuplicateRow()], error: null }),
        // update target
        () => makeChainBuilder({ data: null, error: null }),
        // delete dup
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.delete = vi.fn(() => {
            capturedDelete()
            return b
          })
          return b
        },
      ],
      yarn_usage: [
        () => makeChainBuilder({ data: null, error: null }),
      ],
    }) as never

    const result1 = await consolidateOnStockDuplicates(supabase1, 'user-1', 'target-1')
    expect(result1.deletedIds).toEqual(['dup-1'])
    expect(capturedDelete).toHaveBeenCalled()

    // Andet kald: ingen duplikater
    const supabase2 = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: makeTargetRow({ quantity: 8 }), error: null }), // target med summed qty
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    const result2 = await consolidateOnStockDuplicates(supabase2, 'user-1', 'target-1')
    expect(result2.deletedIds).toHaveLength(0)
  })
})

// ── AC-B3.1: Konsolidering via catalog_color_id-match ─────────────────────────

describe('AC-B3.1: konsolidering via catalog_color_id', () => {
  it('finder duplikat via catalog_color_id, summer quantity, redirecter usage, sletter duplikat', async () => {
    const capturedUpdate = vi.fn()
    const capturedDelete = vi.fn()
    const capturedUsageUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // target lookup: 5 ngl, ingen metadata
        () => makeChainBuilder({ data: makeTargetRow({ quantity: 5 }), error: null }),
        // candidates: én duplikat med 3 ngl
        () => makeChainBuilder({ data: [makeDuplicateRow({ id: 'dup-1', quantity: 3 })], error: null }),
        // update target: quantity=8
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedUpdate(payload)
            return b
          })
          return b
        },
        // delete duplikater
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.delete = vi.fn(() => {
            capturedDelete()
            return b
          })
          return b
        },
      ],
      yarn_usage: [
        // redirect usage: dup-1's usage → target-1
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedUsageUpdate(payload)
            return b
          })
          return b
        },
      ],
    }) as never

    const result = await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    expect(result.mergedInto).toBe('target-1')
    expect(result.deletedIds).toEqual(['dup-1'])
    expect(result.totalQty).toBe(8)  // 5 + 3

    // Usage redirected til target
    expect(capturedUsageUpdate).toHaveBeenCalledWith({ yarn_item_id: 'target-1' })

    // Target opdateret med ny quantity (ingen backfill: ingen metadata at overføre)
    expect(capturedUpdate).toHaveBeenCalledWith(expect.objectContaining({ quantity: 8 }))

    // Duplikat slettet
    expect(capturedDelete).toHaveBeenCalled()
  })
})

// ── AC-B3.2: Identity-match via (brand, color_name, color_code) ───────────────

describe('AC-B3.2: identity-match via brand+color_name+color_code', () => {
  it('finder duplikat via brand+color_name+color_code ILIKE når catalog_color_id er null på begge', async () => {
    const capturedUpdate = vi.fn()

    // Target og duplikat har samme brand/color_name/color_code, ingen catalog_color_id
    const targetNoCatalog = makeTargetRow({
      catalog_color_id: null,
      brand: 'Drops',
      color_name: 'Koral',
      color_code: '16',
      quantity: 4,
    })
    const dupNoCatalog = makeDuplicateRow({
      id: 'dup-nocatalog',
      catalog_color_id: null,
      brand: 'Drops',
      color_name: 'Koral',
      color_code: '16',
      quantity: 6,
    })

    const supabase = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: targetNoCatalog, error: null }),
        () => makeChainBuilder({ data: [dupNoCatalog], error: null }),
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedUpdate(payload)
            return b
          })
          return b
        },
        () => makeChainBuilder({ data: null, error: null }), // delete
      ],
      yarn_usage: [
        () => makeChainBuilder({ data: null, error: null }),
      ],
    }) as never

    const result = await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    expect(result.deletedIds).toEqual(['dup-nocatalog'])
    expect(result.totalQty).toBe(10)  // 4 + 6
    expect(capturedUpdate).toHaveBeenCalledWith(expect.objectContaining({ quantity: 10 }))
  })

  it('finder IKKE match hvis brand er null/tom (utilstrækkelig identity)', async () => {
    // Target og duplikat har ingen catalog_color_id og tom brand → sameYarnIdentity=false
    const targetNoIdentity = makeTargetRow({
      catalog_color_id: null,
      brand: null,
      color_name: 'Koral',
      color_code: '16',
    })
    const dupNoIdentity = makeDuplicateRow({
      id: 'dup-2',
      catalog_color_id: null,
      brand: null,
      color_name: 'Koral',
      color_code: '16',
    })

    const supabase = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: targetNoIdentity, error: null }),
        () => makeChainBuilder({ data: [dupNoIdentity], error: null }),
      ],
    }) as never

    const result = await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    // Tom brand → sameYarnIdentity=false → ingen konsolidering
    expect(result.deletedIds).toHaveLength(0)
  })
})

// ── AC-B3.3: Backfill NULL-felter fra duplikat ────────────────────────────────

describe('AC-B3.3: backfill NULL-felter på target fra duplikat', () => {
  it('target.image_url=null, dup.image_url="cat.jpg" → target får image_url="cat.jpg"', async () => {
    const capturedUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // target: ingen image_url
        () => makeChainBuilder({ data: makeTargetRow({ image_url: null, quantity: 5 }), error: null }),
        // duplikat: har image_url
        () => makeChainBuilder({ data: [makeDuplicateRow({ id: 'dup-1', image_url: 'cat.jpg', quantity: 3 })], error: null }),
        // update target med quantity + backfill
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedUpdate(payload)
            return b
          })
          return b
        },
        () => makeChainBuilder({ data: null, error: null }), // delete
      ],
      yarn_usage: [
        () => makeChainBuilder({ data: null, error: null }),
      ],
    }) as never

    await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    // Backfill: image_url overføres fra duplikat
    expect(capturedUpdate).toHaveBeenCalledWith(expect.objectContaining({
      quantity: 8,
      image_url: 'cat.jpg',
    }))
  })

  it('target.image_url="existing.jpg" (non-NULL) → overskriver IKKE med duplikatens image_url', async () => {
    const capturedUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // target: har image_url
        () => makeChainBuilder({ data: makeTargetRow({ image_url: 'existing.jpg', quantity: 5 }), error: null }),
        // duplikat: har anderledes image_url
        () => makeChainBuilder({ data: [makeDuplicateRow({ id: 'dup-1', image_url: 'other.jpg', quantity: 3 })], error: null }),
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedUpdate(payload)
            return b
          })
          return b
        },
        () => makeChainBuilder({ data: null, error: null }),
      ],
      yarn_usage: [
        () => makeChainBuilder({ data: null, error: null }),
      ],
    }) as never

    await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    const payload = (capturedUpdate.mock.calls[0][0] as Record<string, unknown>)
    // image_url skal IKKE være i payload (target's eksisterende non-NULL bevares)
    expect(payload.image_url).toBeUndefined()
    expect(payload.quantity).toBe(8)
  })

  it('multiple metadata-felter backfilles fra første duplikat med non-NULL', async () => {
    const capturedUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // target: ingen metadata
        () => makeChainBuilder({ data: makeTargetRow({ image_url: null, fiber: null, yarn_weight: null, quantity: 2 }), error: null }),
        // duplikat med metadata
        () => makeChainBuilder({ data: [makeDuplicateRow({ image_url: 'img.png', fiber: 'Uld', yarn_weight: 'DK', quantity: 4 })], error: null }),
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedUpdate(payload)
            return b
          })
          return b
        },
        () => makeChainBuilder({ data: null, error: null }),
      ],
      yarn_usage: [
        () => makeChainBuilder({ data: null, error: null }),
      ],
    }) as never

    await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    const payload = (capturedUpdate.mock.calls[0][0] as Record<string, unknown>)
    expect(payload.image_url).toBe('img.png')
    expect(payload.fiber).toBe('Uld')
    expect(payload.yarn_weight).toBe('DK')
    expect(payload.quantity).toBe(6)
  })
})

// ── To duplikater: alle summeres og slettes ───────────────────────────────────

describe('consolidate: to duplikater summeres og alle slettes', () => {
  it('to duplikater: quantity = target + dup1 + dup2, begge slettes', async () => {
    const capturedDelete = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: makeTargetRow({ quantity: 5 }), error: null }),
        () => makeChainBuilder({ data: [
          makeDuplicateRow({ id: 'dup-1', quantity: 3 }),
          makeDuplicateRow({ id: 'dup-2', quantity: 2 }),
        ], error: null }),
        () => makeChainBuilder({ data: null, error: null }), // update
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.delete = vi.fn(() => {
            capturedDelete()
            return b
          })
          return b
        },
      ],
      yarn_usage: [
        () => makeChainBuilder({ data: null, error: null }),
      ],
    }) as never

    const result = await consolidateOnStockDuplicates(supabase, 'user-1', 'target-1')

    expect(result.deletedIds).toContain('dup-1')
    expect(result.deletedIds).toContain('dup-2')
    expect(result.deletedIds).toHaveLength(2)
    expect(result.totalQty).toBe(10)  // 5 + 3 + 2
    expect(capturedDelete).toHaveBeenCalled()
  })
})
