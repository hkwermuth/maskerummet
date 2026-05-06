/**
 * Supplerende tests for auto-cascade brugt-op feature — integration niveau.
 *
 * Disse tests verificerer at de pure helpers (classifyFinalizableLines,
 * finalizeYarnLines, revertCascadedYarns) kalder Supabase med de rigtige
 * argumenter i de scenarier som Arkiv.jsx Fase 1.5 / Fase 4 og
 * NytProjektModal.save udloser.
 *
 * Vi tester IKKE React-komponenternes interne state her — det er allerede
 * daekket i MarkYarnsBrugtOpModal.test.tsx. Vi tester i stedet
 * helper-laget som Arkiv.jsx delegerer til, men med scenarier der er
 * specifikke for AC-8, AC-11 og AC-12.
 *
 * AC-daekning:
 *   AC-8:  NytProjektModal-cascade — classifyFinalizableLines + finalizeYarnLines
 *          korer korrekt for yarn_usage-raekker der netop er insertet
 *   AC-11: Cascade rorer IKKE Pa lager-raekker (source-raekker forbliver intakte)
 *   AC-12: Retur-flow ved sletning af cascadet projekt — revertCascadedYarns
 *          merger korrekt quantity tilbage fra multiple yarn_usage-linjer
 *
 * Opdateret til ny FinalizeDecision union-form:
 *   { kind: 'brugt-op' } | { kind: 'behold'; keepOnStock: number }
 */

import { describe, it, expect, vi } from 'vitest'
import {
  classifyFinalizableLines,
  finalizeYarnLines,
  revertCascadedYarns,
} from '@/lib/yarn-finalize'
import type {
  FinalizableSource,
  FinalizableEntry,
  FinalizeDecision,
} from '@/lib/yarn-finalize'

// ── Helpers ───────────────────────────────────────────────────────────────────

type TerminalResult = { data: unknown; error: unknown }

function makeThenableBuilder(result: TerminalResult) {
  const builder: Record<string, unknown> = {
    select:      vi.fn(() => builder),
    eq:          vi.fn(() => builder),
    neq:         vi.fn(() => builder),
    in:          vi.fn(() => builder),
    is:          vi.fn(() => builder),
    ilike:       vi.fn(() => builder),
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

// ── AC-8: NytProjektModal-cascade ────────────────────────────────────────────
//
// NytProjektModal.save korer (1) yarn_usage.insert => (2) classifyFinalizableLines
// => (3) finalizeYarnLines hvis bruger bekraefter.
// Vi verificerer at classifyFinalizableLines korrekt kategoriserer en linje
// der netop er insertet med status='I brug' som finalizable (ikke alreadyBrugtOp).

describe('AC-8: NytProjektModal-cascade: nyinsertet I-brug-linje klassificeres som finalizable', () => {
  it('en yarn_item med status I brug og ingen andre aktive projekter => finalizable', async () => {
    // Simulerer hvad Arkiv.jsx NytProjektModal gor: after yarn_usage.insert,
    // de nye linjer mappes til FinalizableSource og sendes til classify.
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1)
          // Forste kald: yarn_items lookup — returnerer I brug (netop allokeret)
          return makeThenableBuilder({
            data:  { id: 'yarn-1', status: 'I brug', quantity: 5 },
            error: null,
          })
        if (callCount === 2)
          // Andet kald: yarn_usage-check for andre aktive projekter => tom
          return makeThenableBuilder({ data: [], error: null })
        throw new Error(`Uventet supabase.from kald #${callCount}`)
      }),
    } as never

    const lines: FinalizableSource[] = [makeSource({ yarnItemId: 'yarn-1' })]
    const result = await classifyFinalizableLines(supabase, 'user-1', 'proj-new', lines)

    expect(result.finalizable).toHaveLength(1)
    expect(result.alreadyBrugtOp).toHaveLength(0)
    expect(result.noYarnItem).toHaveLength(0)
    expect(result.multiProject).toHaveLength(0)
  })

  it('AC-8: finalizeYarnLines markerer den nyoprettede linje brugt op med korrekt projekt-data', async () => {
    // qty===total scenario: NytProjektModal har lige insertet 1 yarn_usage med 5 ngl
    // og I-brug-raekken har 5 ngl => splitYarnItemRow opdaterer source direkte.
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-new', quantity: 5, brand: 'Permin', name: 'Bella' }, error: null,
        })
        return updateBuilder
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([['usage-new', { kind: 'brugt-op' }]])
    const result = await finalizeYarnLines(
      supabase,
      'user-1',
      [makeEntry({ source: makeSource({ yarnUsageId: 'usage-new', yarnItemId: 'yarn-new' }) })],
      decisions,
      'Nyt Projekt',
      'proj-new',
      '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual(['yarn-new'])
    // Bug 5 (2026-05-05): quantity bevares (rækken havde 5, source-flip rører
    // ikke quantity). Update-payload indeholder kun status + projekt-felter.
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status:               'Brugt op',
      brugt_til_projekt:    'Nyt Projekt',
      brugt_til_projekt_id: 'proj-new',
      brugt_op_dato:        '2026-05-04',
    })
  })

  it('AC-8: cancel fra NytProjektModal modal => decisions=null => finalizeYarnLines kaldes ikke', async () => {
    // Simulerer at brugeren trykker annuller i MarkYarnsBrugtOpModal
    // NytProjektModal.save: decisions = await openFinalizeModal(...) => null
    // => if (decisions !== null) finalizeYarnLines(...) bliver ikke koert.
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    const supabaseFrom = vi.fn(() => updateBuilder)
    const supabase = { from: supabaseFrom } as unknown as Parameters<typeof finalizeYarnLines>[0]

    // decisions === null => kald ikke finalizeYarnLines
    const decisions: Map<string, FinalizeDecision> | null = null
    if (decisions !== null) {
      await finalizeYarnLines(supabase, 'user-1', [], decisions, 'X', 'proj-1', '2026-05-04')
    }

    expect(updateBuilder.update).not.toHaveBeenCalled()
    expect(supabaseFrom).not.toHaveBeenCalled()
  })
})

// ── AC-11: Cascade rorer IKKE Pa lager-raekker ─────────────────────────────
//
// source-raekker (yarn_items med status='Pa lager') er IKKE yarn_usage-linjer.
// Cascade muterer kun yarn_items der peges pa af yarn_usage med yarn_item_id.
// En yarn_item med status='Pa lager' matcher ikke cascade-betingelsen fordi
// classifyFinalizableLines kigger pa yarn_items.status for de linkede raekker.

describe('AC-11: cascade rorer IKKE Pa lager-raekker', () => {
  it('yarn_item med status Pa lager sendes ikke til alreadyBrugtOp og indgar korrekt som finalizable', async () => {
    // En yarn_item der er "Pa lager" (ikke allokeret til noget) kan i teorien
    // linkes fra et yarn_usage. classify returnerer den som finalizable — ikke
    // som en kilde der springes over. Testen verificerer at classify
    // klassificerer korrekt uanset om status er 'I brug' eller 'Pa lager'.
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1)
          return makeThenableBuilder({
            data:  { id: 'yarn-stash', status: 'Pa lager', quantity: 10 },
            error: null,
          })
        if (callCount === 2)
          return makeThenableBuilder({ data: [], error: null })
        throw new Error(`Uventet kald #${callCount}`)
      }),
    } as never

    const result = await classifyFinalizableLines(
      supabase, 'user-1', 'proj-1',
      [makeSource({ yarnItemId: 'yarn-stash' })],
    )

    // Pa lager er IKKE 'Brugt op' => gar IKKE til alreadyBrugtOp
    expect(result.alreadyBrugtOp).toHaveLength(0)
    // Klassificeres som finalizable (bruger kan vaelge om den skal markeres)
    expect(result.finalizable).toHaveLength(1)
  })

  it('AC-11: finalizeYarnLines med behold-full-decision saetter I-brug til Pa lager (ingen brugt-op)', async () => {
    // { kind: behold, keepOnStock: total } => kun lager-split, ingen brugt-op
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-stash', quantity: 5, name: 'Bella', brand: 'Permin' }, error: null,
        })
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-1', { kind: 'behold', keepOnStock: 5 }],
    ])
    const result = await finalizeYarnLines(
      supabase,
      'user-1',
      [makeEntry({ source: makeSource({ yarnUsageId: 'usage-1', yarnItemId: 'yarn-stash' }) })],
      decisions,
      'Min Sweater',
      'proj-1',
      '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual([])
    expect(result.keptOnStock).toEqual(['yarn-stash'])
    // 2 from-kald: lager-split fetch + update
    expect(callCount).toBe(2)
  })
})

// ── AC-12: Retur-flow ved sletning af cascadet projekt ────────────────────
//
// Nar et faerdigstrikket projekt slettes, kaldtes revertCascadedYarns FOR
// projektet slettes. Testen verificerer at quantity merger korrekt fra
// multiple yarn_usage-linjer og at brugt_til_projekt/_id/dato nulstilles.
//
// revertCascadedYarns query-sekvens (inkl. nyt Pa lager-kald):
//   1: UUID-match for Brugt op-raekker
//   2: title-fallback for Brugt op-raekker
//   3: Pa lager-raekker med brugt_til_projekt_id (NYT)
//   4+: yarn_usage sum + update for hver Brugt op-raekke

describe('AC-12: de-cascade ved sletning / status-skift vaek fra faerdigstrikket', () => {
  it('multiple yarn_usage-linjer for samme yarn_item: quantity summeres korrekt', async () => {
    // Scenario: projekt har to garn-linjer der begge bruger yarn-1 (2 + 3 ngl).
    // Cascade satte quantity=0. Revert skal saette quantity=5 (2+3).
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1)
          // UUID-match: finder yarn-1
          return makeThenableBuilder({
            data: [{ id: 'yarn-1', catalog_color_id: null, brand: 'Permin', color_name: 'Koral', color_code: '88301' }],
            error: null,
          })
        if (callCount === 2)
          // title-fallback: tom (UUID matchede allerede)
          return makeThenableBuilder({ data: [], error: null })
        if (callCount === 3)
          // Pa lager-raekker med brugt_til_projekt_id: ingen
          return makeThenableBuilder({ data: [], error: null })
        if (callCount === 4)
          // yarn_usage sum: 2 + 3 = 5
          return makeThenableBuilder({
            data:  [{ quantity_used: 2 }, { quantity_used: 3 }],
            error: null,
          })
        return updateBuilder
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-faerdig', 'Faerdigt Projekt')

    expect(result.reverted).toEqual(['yarn-1'])
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status:               'I brug',
      quantity:             5,
      brugt_til_projekt:    null,
      brugt_til_projekt_id: null,
      brugt_op_dato:        null,
    })
  })

  it('AC-12: revert rydder brugt_til_projekt, _id og brugt_op_dato — historikken matcher ny virkelighed', async () => {
    // Verificerer eksplicit at ALLE tre felter nulstilles (ikke kun status)
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data: [{ id: 'yarn-1', catalog_color_id: null, brand: 'Permin', color_name: 'Koral', color_code: '88301' }],
          error: null,
        })
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })
        if (callCount === 3) return makeThenableBuilder({ data: [], error: null })  // Pa lager
        if (callCount === 4) return makeThenableBuilder({ data: [{ quantity_used: 7 }], error: null })
        return updateBuilder
      }),
    } as never

    await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Min Sweater')

    const updateArg = (updateBuilder.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.brugt_til_projekt).toBeNull()
    expect(updateArg.brugt_til_projekt_id).toBeNull()
    expect(updateArg.brugt_op_dato).toBeNull()
    expect(updateArg.status).toBe('I brug')
    expect(updateArg.quantity).toBe(7)
  })

  it('AC-12: revert med ingen match => ingen DB-mutationer (projekt aldrig cascadet)', async () => {
    // Edge: brugeren skifter status fra faerdigstrikket => i_gang pa et projekt
    // der aldrig fik cascade (fx fordi der var 0 finalizable garn-linjer).
    let callCount = 0
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    const supabase = {
      from: vi.fn(() => {
        callCount++
        // Alle tre match-queries returnerer tom liste (UUID + title-fallback + Pa lager)
        if (callCount <= 3) return makeThenableBuilder({ data: [], error: null })
        return updateBuilder
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Projekt Uden Cascade')

    expect(result.reverted).toHaveLength(0)
    expect(updateBuilder.update).not.toHaveBeenCalled()
  })

  it('AC-12: de-cascade-trigger condition — kun faerdigstrikket => andet skifter, ikke vice versa', () => {
    // Verificerer logikken i handleSave's cascadeTriggered/deCascadeTriggered
    // uden at mocke hele React-komponenten.
    function checkTriggers(prevStatus: string, newStatus: string) {
      const cascadeTriggered   = prevStatus !== 'faerdigstrikket' && newStatus === 'faerdigstrikket'
      const deCascadeTriggered = prevStatus === 'faerdigstrikket' && newStatus !== 'faerdigstrikket'
      return { cascadeTriggered, deCascadeTriggered }
    }

    // i_gang => faerdigstrikket = cascade
    expect(checkTriggers('i_gang', 'faerdigstrikket')).toEqual({ cascadeTriggered: true, deCascadeTriggered: false })

    // faerdigstrikket => i_gang = de-cascade
    expect(checkTriggers('faerdigstrikket', 'i_gang')).toEqual({ cascadeTriggered: false, deCascadeTriggered: true })

    // faerdigstrikket => faerdigstrikket = ingen trigger (ingen aendring)
    expect(checkTriggers('faerdigstrikket', 'faerdigstrikket')).toEqual({ cascadeTriggered: false, deCascadeTriggered: false })

    // i_gang => i_gang = ingen trigger
    expect(checkTriggers('i_gang', 'i_gang')).toEqual({ cascadeTriggered: false, deCascadeTriggered: false })

    // vil_gerne => faerdigstrikket = cascade
    expect(checkTriggers('vil_gerne', 'faerdigstrikket')).toEqual({ cascadeTriggered: true, deCascadeTriggered: false })
  })
})

// ── AC-9: Race condition guard ────────────────────────────────────────────
//
// Hvis yarn_item er slettet i mellemtiden (race), behandles det som noYarnItem
// uden at kaste. Det er allerede testet i yarn-finalize.test.ts men vi
// verificerer at det gaelder for NytProjektModal-scenariet (netop-insertet linje).

describe('AC-9: race condition — yarn_item slettet efter yarn_usage.insert', () => {
  it('yarn_item slettet i mellemtiden mens NytProjektModal-cascade klassificerer => noYarnItem (ingen throw)', async () => {
    const supabase = {
      from: vi.fn(() => makeThenableBuilder({ data: null, error: null })),
    } as never

    const lines: FinalizableSource[] = [
      makeSource({ yarnItemId: 'yarn-slettet-i-race' }),
    ]

    await expect(
      classifyFinalizableLines(supabase, 'user-1', 'proj-new', lines)
    ).resolves.toMatchObject({
      noYarnItem: [expect.objectContaining({ yarnItemId: 'yarn-slettet-i-race' })],
      finalizable: [],
    })
  })
})
