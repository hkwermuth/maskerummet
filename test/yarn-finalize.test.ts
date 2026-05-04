/**
 * Unit tests for lib/yarn-finalize.ts
 * Dækker AC-1, AC-3, AC-4, AC-5, AC-7 (UUID-match + legacy title-fallback),
 * AC-9 og AC-11 (cascade rører ikke På lager-rækker — implicit: cascade
 * mutater kun yarn_item_id'er der peges på af yarn_usage, ikke source-rækker).
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
 * Builder der både kan chain'es OG await'es. Når du await'er den, resolver
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
 * Mocker supabase.from() med en sekvens af builders — én pr. .from()-kald.
 * Anvendes når en helper laver flere queries i træk.
 */
function makeSupabaseSequence(builders: ReturnType<typeof makeThenableBuilder>[]) {
  let i = 0
  return { from: vi.fn(() => builders[i++]) } as never
}

// ── classifyFinalizableLines ──────────────────────────────────────────────────

describe('classifyFinalizableLines – AC-1, AC-3, AC-4', () => {
  it('AC-4: linjer uden yarn_item_id går til noYarnItem', async () => {
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

  it('AC-1: I brug-linje uden andre aktive projekter går til finalizable', async () => {
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

  it('yarn_item slettet i mellemtiden → behandles som noYarnItem', async () => {
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

describe('finalizeYarnLines – AC-5', () => {
  it('AC-5: brugt-op-decision sætter status, quantity=0, brugt_til_projekt + _id + dato', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    const supabase = { from: vi.fn(() => updateBuilder) } as never

    const decisions = new Map<string, FinalizeDecision>([['usage-1', 'brugt-op']])
    const result = await finalizeYarnLines(
      supabase,
      'user-1',
      [makeEntry()],
      decisions,
      'Min Sweater',
      'proj-1',
      '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-1'])
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status:               'Brugt op',
      quantity:             0,
      brugt_til_projekt:    'Min Sweater',
      brugt_til_projekt_id: 'proj-1',
      brugt_op_dato:        '2026-05-04',
    })
  })

  it('behold-decision skipper opdatering (default når decision mangler)', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    const supabase = { from: vi.fn(() => updateBuilder) } as never

    // Tom decisions-Map → default 'behold' → skip alle
    const result = await finalizeYarnLines(
      supabase,
      'user-1',
      [makeEntry(), makeEntry({ source: makeSource({ yarnUsageId: 'usage-2', yarnItemId: 'yarn-2' }) })],
      new Map(),
      'Min Sweater',
      'proj-1',
      '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual([])
    expect(updateBuilder.update).not.toHaveBeenCalled()
  })

  it('blanded decisions: kun brugt-op-linjer markeres', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    const supabase = { from: vi.fn(() => updateBuilder) } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', 'brugt-op'],
      ['usage-2', 'behold'],
    ])
    const result = await finalizeYarnLines(
      supabase,
      'user-1',
      [
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-1', yarnItemId: 'yarn-1' }) }),
        makeEntry({ source: makeSource({ yarnUsageId: 'usage-2', yarnItemId: 'yarn-2' }) }),
      ],
      decisions,
      'Min Sweater',
      'proj-1',
      '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-1'])
    expect(updateBuilder.update).toHaveBeenCalledTimes(1)
  })
})

// ── revertCascadedYarns ──────────────────────────────────────────────────────

describe('revertCascadedYarns – AC-7', () => {
  it('AC-7: matcher via brugt_til_projekt_id (UUID, primary) og restaurerer quantity', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: [{ id: 'yarn-1' }], error: null })
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [{ quantity_used: 5 }], error: null })
        return updateBuilder
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(result.reverted).toEqual(['yarn-1'])
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status:               'I brug',
      quantity:             5,
      brugt_til_projekt:    null,
      brugt_til_projekt_id: null,
      brugt_op_dato:        null,
    })
  })

  it('legacy-fallback: matcher via title når brugt_til_projekt_id IS NULL', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: [], error: null })
        if (callCount === 2) return makeThenableBuilder({ data: [{ id: 'yarn-legacy' }], error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [{ quantity_used: 3 }], error: null })
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

  it('dedupe: hvis samme yarn_item findes via både UUID og title, kør update kun én gang', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: [{ id: 'yarn-1' }], error: null })
        if (callCount === 2) return makeThenableBuilder({ data: [{ id: 'yarn-1' }], error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [{ quantity_used: 5 }], error: null })
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
        if (callCount <= 2) return makeThenableBuilder({ data: [], error: null })
        return updateBuilder
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(result.reverted).toEqual([])
    expect(updateBuilder.update).not.toHaveBeenCalled()
  })

  it('quantity restaureres som SUM: 3 + 2 = 5 ngl tilbage til I brug', async () => {
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: [{ id: 'yarn-1' }], error: null })
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })
        if (callCount === 3) return makeThenableBuilder({
          data:  [{ quantity_used: 3 }, { quantity_used: 2 }],
          error: null,
        })
        return updateBuilder
      }),
    } as never

    await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ quantity: 5 }))
  })

  it('uden projectTitle: kører kun UUID-match (ingen title-fallback)', async () => {
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({ data: [], error: null })
        throw new Error('title-fallback skulle ikke køres uden projectTitle')
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', null)
    expect(result.reverted).toEqual([])
    expect(callCount).toBe(1)
  })
})
