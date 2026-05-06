/**
 * Unit tests for metadata-backfill i lib/yarn-allocate.ts
 *
 * Dækker AC-B2.4, AC-B2.5, AC-B2.6:
 *   AC-B2.4: allocateYarnToProject merge-gren backfiller target's NULL-felter fra source
 *   AC-B2.5: overskriver IKKE target's eksisterende non-NULL felter
 *   AC-B2.6: backfill kører KUN ved merged===true (ikke ved createInUseRow-grenen)
 *
 * Alle Supabase-kald er mocket — ingen rigtig DB-hit.
 *
 * allocateYarnToProject call-rækkefølge (merge-gren, catalogColorId match):
 *   [0] decrementYarnItemQuantity: yarn_items maybeSingle (fetch current qty)
 *   [1] decrementYarnItemQuantity: yarn_items update (gte race-safe) → [{ id }]
 *   [2] findInUseRowMatch: yarn_items limit (catalog branch) → [I-brug-row]
 *   [3] UPDATE eksisterende I-brug-række → [{ id }]
 *   [4] backfillMetadataFromSource: yarn_items maybeSingle (source) — Promise.all concurrent
 *   [5] backfillMetadataFromSource: yarn_items maybeSingle (target) — Promise.all concurrent
 *   [6] UPDATE target med backfill (kun hvis noget at backfille)
 *
 * allocateYarnToProject call-rækkefølge (createInUseRow-gren, ingen I-brug match):
 *   [0] decrementYarnItemQuantity maybeSingle
 *   [1] decrementYarnItemQuantity update
 *   [2] findInUseRowMatch catalog limit → [] (ingen match)
 *   [3] findInUseRowMatch name-color limit → [] (brand+colorName+colorCode sat → prøves)
 *   [4] createInUseRow: yarn_items maybeSingle (hent metadata fra source)
 *   [5] createInUseRow: yarn_items insert → select → single → { id }
 */

import { describe, it, expect, vi } from 'vitest'
import { allocateYarnToProject } from '@/lib/yarn-allocate'
import type { AllocatableLine } from '@/lib/yarn-allocate'

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
 * Tabel-routing mock. Hvert kald til from(table) forbruger næste handler i
 * per-table-køen.
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

function makeSource(overrides: Partial<AllocatableLine & { yarnItemId: string }> = {}): AllocatableLine & { yarnItemId: string } {
  return {
    yarnItemId:     'source-1',
    yarnName:       'Bella',
    yarnBrand:      'Permin',
    colorName:      'Koral',
    colorCode:      '88301',
    hex:            '#FF7F6A',
    catalogYarnId:  null,
    catalogColorId: 'color-cat-1',
    ...overrides,
  }
}

// ── AC-B2.6: Backfill kører KUN ved merged=true ───────────────────────────────

describe('AC-B2.6: backfill kører IKKE ved createInUseRow-grenen', () => {
  it('ny I-brug-raekke oprettes (ingen eksisterende match) merged=false ingen backfill-update', async () => {
    // OBS: source har catalogColorId='color-cat-1' OG brand/colorName/colorCode sat.
    // findInUseRowMatch prøver katalog-grenen (ingen match) og DEREFTER
    // name-color-grenen (ingen match) - det er 2 yarn_items kald.
    // Herefter: createInUseRow metadata-hent + INSERT = 2 kald.
    // Total: 2 (decrement) + 2 (findInUse) + 2 (createInUseRow) = 6 kald.
    // INGEN backfill (merged=false).

    const supabase = makeTableRouter({
      yarn_items: [
        // [0] decrement fetch
        () => makeChainBuilder({ data: { quantity: 10 }, error: null }),
        // [1] decrement update
        () => makeChainBuilder({ data: [{ id: 'source-1', quantity: 8 }], error: null }),
        // [2] findInUseRowMatch catalog limit: ingen I-brug
        () => makeChainBuilder({ data: [], error: null }),
        // [3] findInUseRowMatch name-color limit: ingen I-brug
        () => makeChainBuilder({ data: [], error: null }),
        // [4] createInUseRow: metadata fra source
        () => makeChainBuilder({ data: { fiber: 'Uld', yarn_weight: 'DK', hex_colors: null, notes: null, image_url: 'src.jpg', gauge: null, meters: null, color_category: null }, error: null }),
        // [5] createInUseRow INSERT → single → { id: 'inuse-new' }
        () => makeChainBuilder({ data: { id: 'inuse-new' }, error: null }),
      ],
    }) as never

    const result = await allocateYarnToProject(supabase as never, 'user-1', makeSource(), 'proj-1', 2)

    expect(result.merged).toBe(false)
    expect(result.inUseYarnItemId).toBe('inuse-new')
    // 6 kald total (ingen backfill-kald ud over de 6)
    expect((supabase as { from: ReturnType<typeof vi.fn> }).from).toHaveBeenCalledTimes(6)
  })
})

// ── AC-B2.4: Backfill target NULL-felter fra source ───────────────────────────

describe('AC-B2.4: backfill target NULL-felter fra source ved merge', () => {
  it('source.image_url=cat.jpg target.image_url=null giver target image_url=cat.jpg', async () => {
    // Merge-gren: catalogColorId matcher eksisterende I-brug-raekke.
    // Kald: decrement(2) + findInUse-catalog(1) + update-inuse(1) + backfill-reads(2) + backfill-update(1) = 7
    const capturedBackfillUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        // [0] decrement fetch
        () => makeChainBuilder({ data: { quantity: 10 }, error: null }),
        // [1] decrement update
        () => makeChainBuilder({ data: [{ id: 'source-1', quantity: 8 }], error: null }),
        // [2] findInUseRowMatch catalog → eksisterende I-brug-raekke
        () => makeChainBuilder({ data: [{ id: 'inuse-existing', quantity: 3, status: 'I brug' }], error: null }),
        // [3] UPDATE I-brug-raekken
        () => makeChainBuilder({ data: [{ id: 'inuse-existing' }], error: null }),
        // [4] backfill: source maybeSingle (Promise.all concurrent)
        () => makeChainBuilder({
          data: { image_url: 'cat.jpg', fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null },
          error: null,
        }),
        // [5] backfill: target maybeSingle (Promise.all concurrent)
        () => makeChainBuilder({
          data: { image_url: null, fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null },
          error: null,
        }),
        // [6] backfill UPDATE
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedBackfillUpdate(payload)
            return b
          })
          return b
        },
      ],
    }) as never

    const result = await allocateYarnToProject(supabase as never, 'user-1', makeSource(), 'proj-1', 2)

    expect(result.merged).toBe(true)
    expect(result.inUseYarnItemId).toBe('inuse-existing')
    expect(capturedBackfillUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: 'cat.jpg' }),
    )
  })

  it('source har fiber+yarn_weight target mangler begge begge overfoeres', async () => {
    const capturedBackfillUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: { quantity: 5 }, error: null }),
        () => makeChainBuilder({ data: [{ id: 'source-1', quantity: 3 }], error: null }),
        () => makeChainBuilder({ data: [{ id: 'inuse-1', quantity: 2, status: 'I brug' }], error: null }),
        () => makeChainBuilder({ data: [{ id: 'inuse-1' }], error: null }),
        () => makeChainBuilder({ data: { image_url: null, fiber: 'Uld', yarn_weight: 'DK', hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }),
        () => makeChainBuilder({ data: { image_url: null, fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }),
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedBackfillUpdate(payload)
            return b
          })
          return b
        },
      ],
    }) as never

    const result = await allocateYarnToProject(supabase as never, 'user-1', makeSource(), 'proj-1', 2)

    expect(result.merged).toBe(true)
    expect(capturedBackfillUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ fiber: 'Uld', yarn_weight: 'DK' }),
    )
  })
})

// ── AC-B2.5: Overskriver IKKE target's non-NULL felter ────────────────────────

describe('AC-B2.5: backfill overskriver IKKE target eksisterende non-NULL felter', () => {
  it('target.image_url=existing.png source.image_url=cat.jpg target bevarer existing.png', async () => {
    // Ingen backfill-UPDATE: target.image_url er non-NULL → ingen ting at overfoere
    const capturedBackfillUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: { quantity: 5 }, error: null }),
        () => makeChainBuilder({ data: [{ id: 'source-1', quantity: 3 }], error: null }),
        () => makeChainBuilder({ data: [{ id: 'inuse-1', quantity: 2, status: 'I brug' }], error: null }),
        () => makeChainBuilder({ data: [{ id: 'inuse-1' }], error: null }),
        // source: cat.jpg
        () => makeChainBuilder({ data: { image_url: 'cat.jpg', fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }),
        // target: existing.png (non-NULL)
        () => makeChainBuilder({ data: { image_url: 'existing.png', fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }),
        // Eventuel backfill UPDATE maa ikke kaldes
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedBackfillUpdate(payload)
            return b
          })
          return b
        },
      ],
    }) as never

    const result = await allocateYarnToProject(supabase as never, 'user-1', makeSource(), 'proj-1', 2)

    expect(result.merged).toBe(true)
    // Ingen backfill-update: target.image_url er non-NULL
    expect(capturedBackfillUpdate).not.toHaveBeenCalled()
  })

  it('target har image_url=existing.png fiber=null: KUN fiber backfilles fra source', async () => {
    const capturedBackfillUpdate = vi.fn()

    const supabase = makeTableRouter({
      yarn_items: [
        () => makeChainBuilder({ data: { quantity: 5 }, error: null }),
        () => makeChainBuilder({ data: [{ id: 'source-1', quantity: 3 }], error: null }),
        () => makeChainBuilder({ data: [{ id: 'inuse-1', quantity: 2, status: 'I brug' }], error: null }),
        () => makeChainBuilder({ data: [{ id: 'inuse-1' }], error: null }),
        // source: cat.jpg + Uld
        () => makeChainBuilder({ data: { image_url: 'cat.jpg', fiber: 'Uld', yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }),
        // target: existing.png (non-NULL) + ingen fiber
        () => makeChainBuilder({ data: { image_url: 'existing.png', fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }),
        // backfill UPDATE: kun fiber
        () => {
          const b = makeChainBuilder({ data: null, error: null })
          b.update = vi.fn((payload: unknown) => {
            capturedBackfillUpdate(payload)
            return b
          })
          return b
        },
      ],
    }) as never

    await allocateYarnToProject(supabase as never, 'user-1', makeSource(), 'proj-1', 2)

    expect(capturedBackfillUpdate).toHaveBeenCalled()
    const payload = capturedBackfillUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(payload.fiber).toBe('Uld')
    // image_url er IKKE i payload (target's non-NULL bevares)
    expect(payload.image_url).toBeUndefined()
  })
})

// ── Ingen backfill-UPDATE hvis ingen felter at overfoere ────────────────────

describe('ingen backfill-UPDATE hvis ingen felter at overfoere', () => {
  it('source og target begge har alle metadata null ingen ekstra UPDATE kald', async () => {
    let yarnItemsCallCount = 0

    const supabase = makeTableRouter({
      yarn_items: [
        () => { yarnItemsCallCount++; return makeChainBuilder({ data: { quantity: 5 }, error: null }) },
        () => { yarnItemsCallCount++; return makeChainBuilder({ data: [{ id: 'source-1', quantity: 3 }], error: null }) },
        () => { yarnItemsCallCount++; return makeChainBuilder({ data: [{ id: 'inuse-1', quantity: 2, status: 'I brug' }], error: null }) },
        () => { yarnItemsCallCount++; return makeChainBuilder({ data: [{ id: 'inuse-1' }], error: null }) },
        () => { yarnItemsCallCount++; return makeChainBuilder({ data: { image_url: null, fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }) },
        () => { yarnItemsCallCount++; return makeChainBuilder({ data: { image_url: null, fiber: null, yarn_weight: null, hex_colors: null, gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null }, error: null }) },
      ],
    }) as never

    const result = await allocateYarnToProject(supabase as never, 'user-1', makeSource(), 'proj-1', 2)

    expect(result.merged).toBe(true)
    // Nøjagtigt 6 kald: decrement(2) + findInUse-catalog(1) + update-inuse(1) + backfill-reads(2)
    // Ingen 7. kald (ingen backfill-UPDATE fordi backfill={})
    expect(yarnItemsCallCount).toBe(6)
  })
})
