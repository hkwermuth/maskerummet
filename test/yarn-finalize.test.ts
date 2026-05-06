/**
 * Unit tests for lib/yarn-finalize.ts
 * Dækker AC-1, AC-3, AC-4, AC-5, AC-7 (UUID-match + legacy title-fallback),
 * AC-9 og AC-11 (cascade rorer ikke Pa lager-raekker — implicit: cascade
 * mutater kun yarn_item_id'er der peges pa af yarn_usage, ikke source-raekker).
 *
 * Alle Supabase-kald er mocket — ingen rigtig DB-hit.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  classifyFinalizableLines,
  finalizeYarnLines,
  revertCascadedYarns,
} from '@/lib/yarn-finalize'
import type { FinalizableSource, FinalizableEntry, FinalizeDecision } from '@/lib/yarn-finalize'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSource(overrides: Partial<FinalizableSource> = {}): FinalizableSource {
  return {
    yarnUsageId:  'usage-1',
    yarnItemId:   'yarn-1',
    yarnName:     'Bella',
    yarnBrand:    'Permin',
    colorName:    'Koral',
    colorCode:    '88301',
    hex:          '#FF7F6A',
    quantityUsed: 5,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<FinalizableEntry> = {}): FinalizableEntry {
  return {
    source:               makeSource(),
    currentStockQuantity: 5,
    currentStatus:        'I brug',
    ...overrides,
  }
}

/**
 * Builder der bade kan chain'es OG await'es. Nar du await'er den, resolver
 * den med {data, error}. Alle chain-methods returnerer samme builder.
 */
type TerminalResult = { data: unknown; error: unknown }
function makeThenableBuilder(result: TerminalResult) {
  const builder: Record<string, unknown> = {
    select:      vi.fn(() => builder),
    eq:          vi.fn(() => builder),
    neq:         vi.fn(() => builder),
    in:          vi.fn(() => builder),
    is:          vi.fn(() => builder),
    ilike:       vi.fn(() => builder),
    gte:         vi.fn(() => builder),
    limit:       vi.fn(() => builder),
    order:       vi.fn(() => builder),
    update:      vi.fn(() => builder),
    insert:      vi.fn(() => builder),
    delete:      vi.fn(() => builder),
    single:      vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then:        (onFulfilled: (r: TerminalResult) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  return builder
}

/**
 * Mocker supabase.from() med en sekvens af builders — en pr. .from()-kald.
 * Anvendes nar en helper laver flere queries i traek.
 */
function makeSupabaseSequence(builders: ReturnType<typeof makeThenableBuilder>[]) {
  let i = 0
  return { from: vi.fn(() => builders[i++]) } as never
}

// ── classifyFinalizableLines ──────────────────────────────────────────────────

describe('classifyFinalizableLines – AC-1, AC-3, AC-4', () => {
  it('AC-4: linjer uden yarn_item_id gar til noYarnItem', async () => {
    const supabase = { from: vi.fn() } as never

    const result = await classifyFinalizableLines(supabase, 'user-1', 'proj-1', [
      makeSource({ yarnItemId: null }),
    ])

    expect(result.noYarnItem).toHaveLength(1)
    expect(result.finalizable).toHaveLength(0)
  })

  it('alreadyBrugtOp: yarn_item er allerede status="Brugt op"', async () => {
    const supabase = makeSupabaseSequence([
      makeThenableBuilder({
        data:  { id: 'yarn-1', status: 'Brugt op', quantity: 0 },
        error: null,
      }),
    ])

    const result = await classifyFinalizableLines(supabase, 'user-1', 'proj-1', [
      makeSource(),
    ])

    expect(result.alreadyBrugtOp).toHaveLength(1)
    expect(result.finalizable).toHaveLength(0)
  })

  it('AC-1: I brug-linje uden andre aktive projekter gar til finalizable', async () => {
    const supabase = makeSupabaseSequence([
      makeThenableBuilder({
        data:  { id: 'yarn-1', status: 'I brug', quantity: 5 },
        error: null,
      }),
      makeThenableBuilder({ data: [], error: null }), // ingen andre projekter
    ])

    const result = await classifyFinalizableLines(supabase, 'user-1', 'proj-1', [
      makeSource(),
    ])

    expect(result.finalizable).toHaveLength(1)
    expect(result.finalizable[0].currentStockQuantity).toBe(5)
    expect(result.finalizable[0].currentStatus).toBe('I brug')
  })

  it('AC-3: multi-projekt-linje viser andre projekt-titler', async () => {
    const supabase = makeSupabaseSequence([
      makeThenableBuilder({
        data:  { id: 'yarn-1', status: 'I brug', quantity: 8 },
        error: null,
      }),
      makeThenableBuilder({
        data: [
          { project_id: 'proj-2', projects: { id: 'proj-2', title: 'Sweater A', status: 'i_gang', user_id: 'user-1' } },
          { project_id: 'proj-3', projects: { id: 'proj-3', title: 'Cardigan B', status: 'vil_gerne', user_id: 'user-1' } },
        ],
        error: null,
      }),
    ])

    const result = await classifyFinalizableLines(supabase, 'user-1', 'proj-1', [
      makeSource(),
    ])

    expect(result.multiProject).toHaveLength(1)
    expect(result.multiProject[0].otherProjectTitles).toEqual(['Sweater A', 'Cardigan B'])
    expect(result.finalizable).toHaveLength(0)
  })

  it('multi-projekt: dedupliker titler hvis flere usage-rows for samme projekt', async () => {
    const supabase = makeSupabaseSequence([
      makeThenableBuilder({
        data:  { id: 'yarn-1', status: 'I brug', quantity: 8 },
        error: null,
      }),
      makeThenableBuilder({
        data: [
          { project_id: 'proj-2', projects: { title: 'Sweater A', status: 'i_gang', user_id: 'user-1' } },
          { project_id: 'proj-2', projects: { title: 'Sweater A', status: 'i_gang', user_id: 'user-1' } },
        ],
        error: null,
      }),
    ])

    const result = await classifyFinalizableLines(supabase, 'user-1', 'proj-1', [
      makeSource(),
    ])

    expect(result.multiProject[0].otherProjectTitles).toEqual(['Sweater A'])
  })

  it('yarn_item slettet i mellemtiden behandles som noYarnItem', async () => {
    const supabase = makeSupabaseSequence([
      makeThenableBuilder({ data: null, error: null }),
    ])

    const result = await classifyFinalizableLines(supabase, 'user-1', 'proj-1', [
      makeSource(),
    ])

    expect(result.noYarnItem).toHaveLength(1)
    expect(result.finalizable).toHaveLength(0)
  })
})

// ── finalizeYarnLines ────────────────────────────────────────────────────────
//
// finalizeYarnLines kalder splitYarnItemRow som:
//   1. fetch source-row (select * eq id eq user_id maybeSingle)
//   2. hvis qty === currentQty: update source (status + ...extraOnNew) eq id eq user_id
//   3. hvis qty < currentQty: decrement source + insert ny raekke
// Ved qty < total redirect'es yarn_usage til den nye raekke.

describe('finalizeYarnLines – AC-2: brugt-op decision (qty === total: source bliver Brugt op direkte)', () => {
  it('nar yarn_usage forbruger HELE I-brug-raekkens quantity, skifter source-raekken status', async () => {
    // makeEntry har quantityUsed=5, currentStockQuantity=5, qty===total
    // splitYarnItemRow opdaterer source direkte (ingen ny raekke, ingen redirect)
    const sourceBuilder = makeThenableBuilder({
      data: { id: 'yarn-1', quantity: 5, name: 'Bella', brand: 'Permin' },
      error: null,
    })
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return sourceBuilder      // splitYarnItemRow fetch
        return updateBuilder                            // splitYarnItemRow update
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([['usage-1', { kind: 'brugt-op' }]])
    const result = await finalizeYarnLines(
      supabase, 'user-1', [makeEntry()], decisions, 'Min Sweater', 'proj-1', '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-1'])
    expect(result.keptOnStock).toEqual([])
    // Bug 5 (2026-05-05): quantity bevares (ikke 0) på Brugt op-rækken så
    // forbruget er synligt i Mit Garn. Source.quantity=5 forbliver uændret.
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status:               'Brugt op',
      brugt_til_projekt:    'Min Sweater',
      brugt_til_projekt_id: 'proj-1',
      brugt_op_dato:        '2026-05-04',
    })
  })
})

describe('finalizeYarnLines – AC-3: split + redirect ved qty < total', () => {
  it('Bug 1 fix: kun valgt yarn_usage rammes nar flere peger pa samme yarn_item (merged)', async () => {
    // Scenarie: I-brug-raekke har 5 ngl, men brugeren har to yarn_usage-raekker
    // (3 ngl + 2 ngl) der peger pa den. User markerer kun 3-ngl-linjen som
    // Brugt op. Forventet: source decrement til 2 ngl, ny Brugt op-raekke
    // (quantity=3, det forbrugte antal), yarn_usage redirected til ny raekke.
    const insertCaptured = vi.fn()
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        // 1: splitYarnItemRow fetch source
        if (callCount === 1) return makeThenableBuilder({
          data: {
            id: 'yarn-merged', quantity: 5,
            name: 'Bella', brand: 'Permin', color_name: 'Koral', color_code: '88301',
            hex_color: '#FF7F6A',
          },
          error: null,
        })
        // 2: decrementYarnItemQuantity fetch current quantity
        if (callCount === 2) return makeThenableBuilder({ data: { quantity: 5 }, error: null })
        // 3: decrementYarnItemQuantity update with gte
        if (callCount === 3) return makeThenableBuilder({
          data: [{ id: 'yarn-merged', quantity: 2 }], error: null,
        })
        // 4: insert ny raekke (Brugt op, 0 ngl)
        if (callCount === 4) {
          const builder = makeThenableBuilder({ data: { id: 'yarn-brugtop-new' }, error: null })
          builder.insert = vi.fn((payload: unknown) => {
            insertCaptured(payload)
            return builder
          })
          return builder
        }
        // 5: yarn_usage redirect-update
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([['usage-1', { kind: 'brugt-op' }]])
    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [makeEntry({
        source:               makeSource({ yarnUsageId: 'usage-1', yarnItemId: 'yarn-merged', quantityUsed: 3 }),
        currentStockQuantity: 5,
      })],
      decisions, 'Min Sweater', 'proj-1', '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-brugtop-new'])
    // Bug 5 (2026-05-05): insert-payload har quantity=3 (det forbrugte antal),
    // ikke 0 som tidligere konvention. Brugt_til_projekt_id markerer rækken
    // til revert-mergel.
    expect(insertCaptured).toHaveBeenCalledWith([expect.objectContaining({
      status:               'Brugt op',
      quantity:             3,
      brugt_til_projekt:    'Min Sweater',
      brugt_til_projekt_id: 'proj-1',
      brugt_op_dato:        '2026-05-04',
    })])
  })
})

describe('finalizeYarnLines – AC-2: behold-full (keepOnStock=total)', () => {
  it('{ kind: behold, keepOnStock: total } giver KUN lager-split, ingen brugt-op-call', async () => {
    // keepOnStock===total => useUp=0 => kun et splitYarnItemRow-kald med Pa lager
    // qty===currentQty (5===5) => update source direkte med Pa lager + brugt_til_projekt_id
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-1', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null,
        })
        return updateBuilder
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'behold', keepOnStock: 5 }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1', [makeEntry()], decisions, 'Min Sweater', 'proj-1', '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual([])
    expect(result.keptOnStock).toEqual(['yarn-1'])
    // Update med Pa lager og brugt_til_projekt_id-marker
    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      status:               'På lager',
      brugt_til_projekt_id: 'proj-1',
    }))
    // Ingen brugt-op-kald = 2 from-kald total (fetch + update for lager-split)
    expect(callCount).toBe(2)
  })

  it('{ kind: behold, keepOnStock: 0 } er aekvivilant med brugt-op (ingen lager-split)', async () => {
    // keepOnStock=0 => useUp=total => kun brugt-op-split (ingen lager-split)
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-1', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null,
        })
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'behold', keepOnStock: 0 }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1', [makeEntry()], decisions, 'Min Sweater', 'proj-1', '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-1'])
    expect(result.keptOnStock).toEqual([])
    // Ingen lager-split = kun 2 from-kald (fetch + update for brugt-op)
    expect(callCount).toBe(2)
  })
})

describe('finalizeYarnLines – blandet decisions', () => {
  it('blandet: brugt-op-linje markeres, behold-full-linje saettes pa lager', async () => {
    // usage-1: { kind: brugt-op } => 2 kald (fetch + update)
    // usage-2: { kind: behold, keepOnStock: 5 } => 2 kald (fetch + update)
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-1', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null,
        })
        if (callCount === 2) return makeThenableBuilder({ data: null, error: null })
        if (callCount === 3) return makeThenableBuilder({
          data: { id: 'yarn-2', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null,
        })
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'brugt-op' }],
      ['usage-2', { kind: 'behold', keepOnStock: 5 }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-1', yarnItemId: 'yarn-1' }) }),
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-2', yarnItemId: 'yarn-2' }) }),
      ],
      decisions,
      'Min Sweater', 'proj-1', '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-1'])
    expect(result.keptOnStock).toEqual(['yarn-2'])
    expect(callCount).toBe(4)
  })

  it('AC-5: klamp rawInput < 0 til 0 (keepOnStock klampes i finalizeYarnLines)', async () => {
    // keepOnStock=-3 => klampes til 0 => useUp=5 => brugt-op-path
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-1', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null,
        })
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'behold', keepOnStock: -3 }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1', [makeEntry()], decisions, 'Min Sweater', 'proj-1', '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-1'])
    expect(result.keptOnStock).toEqual([])
  })

  it('AC-5: klamp rawInput > total til total (keepOnStock klampes i finalizeYarnLines)', async () => {
    // keepOnStock=99 men total=5 => klampes til 5 => useUp=0 => behold-full-path
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-1', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null,
        })
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'behold', keepOnStock: 99 }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1', [makeEntry()], decisions, 'Min Sweater', 'proj-1', '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual([])
    expect(result.keptOnStock).toEqual(['yarn-1'])
  })
})

// ── revertCascadedYarns ──────────────────────────────────────────────────────
//
// revertCascadedYarns foretager nu 3 indledende queries:
//   1: UUID-match for Brugt op-raekker
//   2: title-fallback for Brugt op-raekker
//   3: Pa lager-raekker med brugt_til_projekt_id (NYT)
// Derefter: for hver Brugt op-raekke: yarn_usage-sum + update
// For Pa lager-raekker (behold-split/behold-full): delete (sibling) eller update

describe('revertCascadedYarns – AC-7', () => {
  it('AC-7: matcher via brugt_til_projekt_id (UUID, primary) og restaurerer quantity', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: [{ id: 'yarn-1', catalog_color_id: null, brand: 'P', color_name: 'K', color_code: '1' }],
          error: null,
        })  // UUID-match: finder Brugt op-raekke
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })   // title-fallback: ingen
        if (callCount === 3) return makeThenableBuilder({ data: [], error: null })   // Pa lager-raekker: ingen
        if (callCount === 4) return makeThenableBuilder({ data: [{ quantity_used: 5 }], error: null })
        return updateBuilder
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(result.reverted).toEqual(['yarn-1'])
    expect(result.mergedFromStock).toEqual([])
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status:               'I brug',
      quantity:             5,
      brugt_til_projekt:    null,
      brugt_til_projekt_id: null,
      brugt_op_dato:        null,
    })
  })

  it('legacy-fallback: matcher via title nar brugt_til_projekt_id IS NULL', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: [], error: null })   // UUID: ingen
        if (callCount === 2) return makeThenableBuilder({
          data: [{ id: 'yarn-legacy', catalog_color_id: null, brand: 'P', color_name: 'K', color_code: '1' }],
          error: null,
        })  // title-fallback: finder
        if (callCount === 3) return makeThenableBuilder({ data: [], error: null })   // Pa lager: ingen
        if (callCount === 4) return makeThenableBuilder({ data: [{ quantity_used: 3 }], error: null })
        return updateBuilder
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(result.reverted).toEqual(['yarn-legacy'])
    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      status:   'I brug',
      quantity: 3,
    }))
  })

  it('dedupe: hvis samme yarn_item findes via bade UUID og title, kor update kun en gang', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: [{ id: 'yarn-1', catalog_color_id: null, brand: 'P', color_name: 'K', color_code: '1' }],
          error: null,
        })  // UUID match
        if (callCount === 2) return makeThenableBuilder({
          data: [{ id: 'yarn-1', catalog_color_id: null, brand: 'P', color_name: 'K', color_code: '1' }],
          error: null,
        })  // title-fallback finder samme
        if (callCount === 3) return makeThenableBuilder({ data: [], error: null })   // Pa lager: ingen
        if (callCount === 4) return makeThenableBuilder({ data: [{ quantity_used: 5 }], error: null })
        return updateBuilder
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(result.reverted).toEqual(['yarn-1'])
    expect(updateBuilder.update).toHaveBeenCalledTimes(1)
  })

  it('ingen match: returnerer tom liste, ingen DB-mutationer', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount <= 3) return makeThenableBuilder({ data: [], error: null })
        return updateBuilder
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(result.reverted).toEqual([])
    expect(result.mergedFromStock).toEqual([])
    expect(updateBuilder.update).not.toHaveBeenCalled()
  })

  it('legacy quantity=0 restaureres via SUM: 3 + 2 = 5 ngl tilbage til I brug', async () => {
    // Pre-Bug-5 (eller pre-backfill) Brugt op-raekker har quantity=0. Revert
    // skal falde tilbage til SUM(yarn_usage.quantity_used) for at finde det
    // korrekte tal.
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: [{ id: 'yarn-1', quantity: 0, catalog_color_id: null, brand: 'P', color_name: 'K', color_code: '1' }],
          error: null,
        })
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [], error: null })
        if (callCount === 4) return makeThenableBuilder({
          data:  [{ quantity_used: 3 }, { quantity_used: 2 }],
          error: null,
        })
        return updateBuilder
      }),
    } as never

    await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ quantity: 5 }))
  })

  it('Bug 5 (2026-05-05): post-Bug-5-raekke med quantity=3 restaureres direkte (ingen SUM-query)', async () => {
    // Ny datamodel: rakken bevarer quantity=useUp. Revert laeser direkte
    // row.quantity og springer yarn_usage-SUM-queryen over.
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let yarnUsageQueried = false
    let callCount = 0
    const supabase = {
      from: vi.fn((table: string) => {
        callCount++
        if (table === 'yarn_usage') {
          yarnUsageQueried = true
          return makeThenableBuilder({ data: [], error: null })
        }
        if (callCount === 1) return makeThenableBuilder({
          data: [{ id: 'yarn-1', quantity: 3, catalog_color_id: null, brand: 'P', color_name: 'K', color_code: '1' }],
          error: null,
        })
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [], error: null })
        return updateBuilder
      }),
    } as never

    await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(yarnUsageQueried).toBe(false)
    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 }))
  })

  it('uden projectTitle: korer kun UUID-match (ingen title-fallback)', async () => {
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: [], error: null })  // UUID-match
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })  // Pa lager
        throw new Error('title-fallback skulle ikke kores uden projectTitle')
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', null)
    expect(result.reverted).toEqual([])
    // Med null title springes title-fallback over (kun 2 kald: UUID + Pa lager)
    expect(callCount).toBe(2)
  })
})

// ── AC-6: revertCascadedYarns behold-split (Pa lager-sibling slettes) ───────

describe('revertCascadedYarns – AC-6: behold-split og behold-full revert', () => {
  it('AC-6 legacy-fallback: Brugt op-row uden quantity falder til SUM(yarn_usage); Pa lager-sibling slettes', async () => {
    // Pre-Bug-5 (eller pre-backfill): Brugt op-row har quantity=0, sibling Pa
    // lager-row har quantity=0 (mockes uden quantity-felt). Fast-path slaar
    // ikke til, fallback til yarn_usage SUM (3 ngl). Sibling slettes.
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    const deleteBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: [{ id: 'yarn-brugtop', catalog_color_id: 'color-1', brand: null, color_name: null, color_code: null }],
          error: null,
        })  // UUID-match: Brugt op-raekke (ingen quantity)
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })  // title-fallback: ingen
        if (callCount === 3) return makeThenableBuilder({
          data: [{ id: 'yarn-lager', catalog_color_id: 'color-1', brand: null, color_name: null, color_code: null }],
          error: null,
        })  // Pa lager-raekker (ingen quantity)
        if (callCount === 4) return makeThenableBuilder({
          data: [{ quantity_used: 3 }], error: null,
        })  // yarn_usage SUM-fallback
        if (callCount === 5) return updateBuilder   // update Brugt op => I brug
        return deleteBuilder                         // delete Pa lager-sibling
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Test')

    expect(result.reverted).toEqual(['yarn-brugtop'])
    expect(result.mergedFromStock).toEqual(['yarn-lager'])
    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'I brug', quantity: 3,
    }))
    expect(deleteBuilder.delete).toHaveBeenCalled()
  })

  it('Bug 5 (2026-05-05): post-Bug-5 behold-split summerer brugt op + sibling Pa lager → I brug', async () => {
    // Scenario: bruger havde 5 ngl I brug, valgte ved finalize "behold 3 paa
    // lager + brug 2 op". Datamodellen efter finalize:
    //   - Brugt op-row: quantity=2, brugt_til_projekt_id=P
    //   - Pa lager-row: quantity=3, brugt_til_projekt_id=P (sibling)
    // Ved revert skal I brug-rækken faa quantity=5 (2+3) — IKKE 2 (kun
    // brugt op-andelen) eller 3 (kun lager-andelen). Sibling Pa lager-row
    // slettes for at undga dobbelt-taelling.
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    const deleteBuilder = makeThenableBuilder({ data: null, error: null })
    let yarnUsageQueried = false
    let callCount = 0
    const supabase = {
      from: vi.fn((table: string) => {
        callCount++
        if (table === 'yarn_usage') {
          yarnUsageQueried = true
          return makeThenableBuilder({ data: [], error: null })
        }
        if (callCount === 1) return makeThenableBuilder({
          data: [{ id: 'yarn-brugtop', quantity: 2, catalog_color_id: 'color-1', brand: null, color_name: null, color_code: null }],
          error: null,
        })  // UUID-match: Brugt op med quantity=2
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })  // title-fallback: ingen
        if (callCount === 3) return makeThenableBuilder({
          data: [{ id: 'yarn-lager', quantity: 3, catalog_color_id: 'color-1', brand: null, color_name: null, color_code: null }],
          error: null,
        })  // Pa lager-row med quantity=3 (sibling)
        if (callCount === 4) return updateBuilder   // update Brugt op => I brug, quantity=5
        return deleteBuilder                         // delete Pa lager-sibling
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Test')

    expect(result.reverted).toEqual(['yarn-brugtop'])
    expect(result.mergedFromStock).toEqual(['yarn-lager'])
    expect(yarnUsageQueried).toBe(false)  // fast-path bruges (ikke SUM-fallback)
    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'I brug', quantity: 5,
    }))
    expect(deleteBuilder.delete).toHaveBeenCalled()
  })

  it('AC-6b: behold-full (kun Pa lager-raekke, ingen Brugt op-sibling) opdaterer til I brug', async () => {
    // behold-full scenario: ingen Brugt op-raekker, kun Pa lager-raekke med brugt_til_projekt_id
    // Pa lager flyttes til I brug og marker ryddes
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: [], error: null })  // UUID: ingen Brugt op
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })  // title-fallback: ingen
        if (callCount === 3) return makeThenableBuilder({
          data: [{ id: 'yarn-lager', catalog_color_id: 'color-1', brand: null, color_name: null, color_code: null }],
          error: null,
        })  // Pa lager-raekke
        return updateBuilder  // update Pa lager => I brug
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Test')

    expect(result.reverted).toContain('yarn-lager')
    expect(result.mergedFromStock).toEqual([])
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status:               'I brug',
      brugt_til_projekt:    null,
      brugt_til_projekt_id: null,
      brugt_op_dato:        null,
    })
  })
})

// ── B1: Gruppering af multiple yarn_usage på samme yarn_item_id ──────────────
//
// finalizeYarnLines grupperer entries på yarnItemId og kører én splitYarnItemRow
// pr. gruppe frem for én pr. yarn_usage-linje.
//
// splitYarnItemRow kald-sekvens (qty < total → split):
//   1: fetch source row (select * maybeSingle)
//   2: decrementYarnItemQuantity fetch (maybeSingle)
//   3: decrementYarnItemQuantity update (gte)
//   4: insert ny raekke (single)
// Derefter: redirect yarn_usage for hver entry i gruppen (én update pr. entry).
//
// splitYarnItemRow kald-sekvens (qty === total → source opdateres direkte):
//   1: fetch source row
//   2: update source
// Ingen redirect (newYarnItemId === sourceYarnItemId).

describe('B1: finalizeYarnLines grupperer multiple yarn_usage paa samme yarn_item', () => {
  it('AC-B1.1: to yarn_usage brugt-op paa samme yarn_item -> EN Brugt op-raekke med summeret qty', async () => {
    // usage-1: 3 ngl, usage-2: 5 ngl. Begge brugt-op.
    // totalUseUp=8. source.quantity=10 > 8 => split-path.
    // Forventede kald:
    //   1: splitYarnItemRow fetch source (qty=10)
    //   2: decrementYarnItemQuantity fetch current
    //   3: decrementYarnItemQuantity update gte
    //   4: insert ny Brugt op-raekke (quantity=8)
    //   5: redirect usage-1
    //   6: redirect usage-2
    const insertCaptured = vi.fn()
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-1', quantity: 10, name: 'Bella', brand: 'Permin', color_name: 'Koral', color_code: '88301', hex_color: '#FF7F6A' },
          error: null,
        })
        if (callCount === 2) return makeThenableBuilder({ data: { quantity: 10 }, error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [{ id: 'yarn-1', quantity: 2 }], error: null })
        if (callCount === 4) {
          const b = makeThenableBuilder({ data: { id: 'yarn-brugtop-new' }, error: null })
          b.insert = vi.fn((payload: unknown) => {
            insertCaptured(payload)
            return b
          })
          return b
        }
        // kald 5+6: redirect yarn_usage
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'brugt-op' }],
      ['usage-2', { kind: 'brugt-op' }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-1', yarnItemId: 'yarn-1', quantityUsed: 3 }), currentStockQuantity: 10 }),
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-2', yarnItemId: 'yarn-1', quantityUsed: 5 }), currentStockQuantity: 10 }),
      ],
      decisions, 'Min Sweater', 'proj-1', '2026-05-06',
    )

    // EN ny Brugt op-raekke med summeret qty=8
    expect(result.markedBrugtOp).toEqual(['yarn-brugtop-new'])
    expect(result.markedBrugtOp).toHaveLength(1)
    expect(insertCaptured).toHaveBeenCalledWith([expect.objectContaining({
      status:   'Brugt op',
      quantity: 8,  // 3 + 5
    })])

    // Begge yarn_usage redirectet (kald 5+6)
    expect(callCount).toBe(6)
  })

  it('AC-B1.2: tre yarn_usage brugt-op paa samme yarn_item -> EN Brugt op-raekke med summen', async () => {
    // usage-1: 2, usage-2: 3, usage-3: 5. totalUseUp=10. source.quantity=10 => qty===total => source flippes direkte.
    // Kald:
    //   1: fetch source (qty=10)
    //   2: update source direkte (ingen insert, ingen redirect da newYarnItemId===sourceYarnItemId)
    const updateCaptured = vi.fn()
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-1', quantity: 10, name: 'Bella', brand: 'Permin' },
          error: null,
        })
        const b = makeThenableBuilder({ data: null, error: null })
        b.update = vi.fn((payload: unknown) => {
          updateCaptured(payload)
          return b
        })
        return b
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'brugt-op' }],
      ['usage-2', { kind: 'brugt-op' }],
      ['usage-3', { kind: 'brugt-op' }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-1', yarnItemId: 'yarn-1', quantityUsed: 2 }), currentStockQuantity: 10 }),
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-2', yarnItemId: 'yarn-1', quantityUsed: 3 }), currentStockQuantity: 10 }),
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-3', yarnItemId: 'yarn-1', quantityUsed: 5 }), currentStockQuantity: 10 }),
      ],
      decisions, 'Min Sweater', 'proj-1', '2026-05-06',
    )

    // totalUseUp=10===source.quantity => source flippes direkte (ingen ny raekke)
    expect(result.markedBrugtOp).toEqual(['yarn-1'])
    expect(result.markedBrugtOp).toHaveLength(1)
    expect(updateCaptured).toHaveBeenCalledWith({
      status:               'Brugt op',
      brugt_til_projekt:    'Min Sweater',
      brugt_til_projekt_id: 'proj-1',
      brugt_op_dato:        '2026-05-06',
    })
    // Kun 2 kald (fetch + update direkte — ingen insert, ingen redirect)
    expect(callCount).toBe(2)
  })

  it('AC-B1.3: to yarn_usage: én brugt-op(5ngl) + én behold-full(3ngl) -> EN brugt-op(5) + EN paa lager(3)', async () => {
    // usage-1: brugt-op, 5 ngl. usage-2: behold, keepOnStock=3ngl.
    // Gruppe for 'yarn-1': totalKeep=3, totalUseUp=5. source.quantity=8.
    //
    // Step 1 (lager-split, totalKeep=3):
    //   splitYarnItemRow('yarn-1', 3, 'Paa lager'):
    //   kald 1: fetch source (qty=8)
    //   kald 2: decrement fetch (qty=8)
    //   kald 3: decrement update (gte) -> quantity=5
    //   kald 4: insert lager-raekke -> 'yarn-lager-new'
    //
    // Step 2 (brugt-op-split, totalUseUp=5):
    //   splitYarnItemRow('yarn-1', 5, 'Brugt op'):
    //   kald 5: fetch source (qty=5 efter decrement)
    //   kald 6: qty===currentQty => update source direkte
    //   Ingen redirect (newId===sourceId).
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        // Lager-split:
        if (callCount === 1) return makeThenableBuilder({ data: { id: 'yarn-1', quantity: 8, name: 'Bella', brand: 'Permin' }, error: null })
        if (callCount === 2) return makeThenableBuilder({ data: { quantity: 8 }, error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [{ id: 'yarn-1', quantity: 5 }], error: null })
        if (callCount === 4) {
          const b = makeThenableBuilder({ data: { id: 'yarn-lager-new' }, error: null })
          b.insert = vi.fn(() => b)
          return b
        }
        // Brugt op-split:
        if (callCount === 5) return makeThenableBuilder({ data: { id: 'yarn-1', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null })
        // kald 6: update source direkte (qty===currentQty)
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'brugt-op' }],
      ['usage-2', { kind: 'behold', keepOnStock: 3 }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-1', yarnItemId: 'yarn-1', quantityUsed: 5 }), currentStockQuantity: 8 }),
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-2', yarnItemId: 'yarn-1', quantityUsed: 3 }), currentStockQuantity: 8 }),
      ],
      decisions, 'Min Sweater', 'proj-1', '2026-05-06',
    )

    // EN lager-raekke + EN brugt-op-raekke
    expect(result.keptOnStock).toHaveLength(1)
    expect(result.markedBrugtOp).toHaveLength(1)
    // keptOnStock peger paa lager-raekkens id
    expect(result.keptOnStock).toContain('yarn-lager-new')
    // markedBrugtOp peger paa source (source flippes da totalUseUp===residual qty)
    expect(result.markedBrugtOp).toContain('yarn-1')
  })

  it('AC-B1.4: to yarn_usage blandet split: summeret useUp + summeret keep, EN raekke hver', async () => {
    // usage-1: behold keepOnStock=2 af 5ngl. useUp=3.
    // usage-2: behold keepOnStock=1 af 4ngl. useUp=3.
    // totalKeep=3, totalUseUp=6. source.quantity=9.
    //
    // Lager-split for totalKeep=3:
    //   kald 1: fetch (qty=9)
    //   kald 2: decrement fetch
    //   kald 3: decrement update -> qty=6
    //   kald 4: insert lager -> 'yarn-lager'
    //
    // Brugt op-split for totalUseUp=6:
    //   kald 5: fetch source (qty=6)
    //   kald 6: qty===currentQty => update source direkte
    //   Ingen redirect.
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: { id: 'yarn-1', quantity: 9, name: 'Bella', brand: 'Permin' }, error: null })
        if (callCount === 2) return makeThenableBuilder({ data: { quantity: 9 }, error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [{ id: 'yarn-1', quantity: 6 }], error: null })
        if (callCount === 4) {
          const b = makeThenableBuilder({ data: { id: 'yarn-lager' }, error: null })
          b.insert = vi.fn(() => b)
          return b
        }
        if (callCount === 5) return makeThenableBuilder({ data: { id: 'yarn-1', quantity: 6, name: 'Bella', brand: 'Permin' }, error: null })
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'behold', keepOnStock: 2 }],
      ['usage-2', { kind: 'behold', keepOnStock: 1 }],
    ])
    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-1', yarnItemId: 'yarn-1', quantityUsed: 5 }), currentStockQuantity: 9 }),
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-2', yarnItemId: 'yarn-1', quantityUsed: 4 }), currentStockQuantity: 9 }),
      ],
      decisions, 'Min Sweater', 'proj-1', '2026-05-06',
    )

    expect(result.keptOnStock).toHaveLength(1)
    expect(result.markedBrugtOp).toHaveLength(1)
    expect(result.keptOnStock[0]).toBe('yarn-lager')
    expect(result.markedBrugtOp[0]).toBe('yarn-1')
  })

  it('AC-B1.5: single-line-tilfaelde (én yarn_usage) virker uaendret', async () => {
    // Verifikation af eksisterende behavior er ikke brudt af grupperingen.
    // Én usage med brugt-op, qty===total => source flippes direkte.
    const updateCaptured = vi.fn()
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-1', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null,
        })
        const b = makeThenableBuilder({ data: null, error: null })
        b.update = vi.fn((payload: unknown) => {
          updateCaptured(payload)
          return b
        })
        return b
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([['usage-1', { kind: 'brugt-op' }]])
    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [makeEntry()],
      decisions, 'Min Sweater', 'proj-1', '2026-05-06',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-1'])
    expect(result.keptOnStock).toEqual([])
    expect(callCount).toBe(2)  // kun fetch + update
    expect(updateCaptured).toHaveBeenCalledWith({
      status:               'Brugt op',
      brugt_til_projekt:    'Min Sweater',
      brugt_til_projekt_id: 'proj-1',
      brugt_op_dato:        '2026-05-06',
    })
  })
})
