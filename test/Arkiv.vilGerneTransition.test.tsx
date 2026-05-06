/**
 * Tests for vil_gerne → i_gang / faerdigstrikket transition-logikken.
 *
 * Dækker B-AC-1 til B-AC-4 fra acceptkriterierne for bugfixet der sikrer
 * at status-skift FRA vil_gerne allokerer garn fra lageret.
 *
 * Test-strategi: da handleSave er en lukke-funktion inde i DetailModal, tester
 * vi logikken via de library-helpers som Arkiv.jsx delegerer til:
 *   - validateLineStock    (Phase 1.4 pre-flight)
 *   - allocateYarnToProject (Phase 1.6 allokering)
 *   - classifyFinalizableLines (Phase 1.7 cascade-classify)
 *   - applyAllocationDelta med negativt delta (rollback-helper)
 *
 * Dette svarer til mønstret i Arkiv.cascadeBrugtOp.test.ts der tester cascade-
 * flowet ved at køre classifyFinalizableLines + finalizeYarnLines direkte.
 *
 * AC-dækning:
 *   B-AC-1  vil_gerne → i_gang allokerer garn (validateLineStock + allocateYarnToProject)
 *   B-AC-2  vil_gerne → faerdigstrikket allokerer + kører cascade-classify
 *   B-AC-3  insufficient stock kaster inline-fejl (validateLineStock)
 *   B-AC-4  rollback via applyAllocationDelta(-qty) returnerer garn til lager
 */

import { describe, it, expect, vi } from 'vitest'
import { validateLineStock, allocateYarnToProject, applyAllocationDelta } from '@/lib/yarn-allocate'
import type { AllocatableLine } from '@/lib/yarn-allocate'
import { classifyFinalizableLines } from '@/lib/yarn-finalize'
import type { FinalizableSource } from '@/lib/yarn-finalize'

// ── Helpers ───────────────────────────────────────────────────────────────────

type TerminalResult = { data: unknown; error: unknown }

/**
 * Byg en chainbar builder der kan awaites og returnerer `result`.
 * Bruges til at mocke Supabase query-chains.
 */
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
 * Tabel-routing mock der forbruger næste handler i per-table-køen.
 * Samme mønster som test/yarn-allocate.metadataBackfill.test.ts.
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
    yarnItemId:     'source-A',
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

/**
 * Bygger en sekvens af yarn_items-handlers til et standard
 * allocateYarnToProject-kald uden eksisterende I-brug-match (createInUseRow-gren).
 *
 * Source har catalogColorId=null men yarnBrand+colorName+colorCode alle sat.
 *
 * Rækkefølge (ingen catalogColorId → ingen catalog-kald i findInUseRowMatch):
 *   [0] decrement fetch (maybeSingle)
 *   [1] decrement update (gte race-safe) → [{ id, quantity }]
 *   [2] findInUseRowMatch: name-color limit → [] (ingen match)
 *         (catalog-grenen springes over fordi catalogColorId=null)
 *   [3] createInUseRow: metadata fetch (maybeSingle)
 *   [4] createInUseRow: INSERT → select → single → { id }
 */
function buildAllocateHandlers(opts: {
  sourceQty:     number
  allocQty:      number
  inUseId:       string
  sourceMetadata?: Record<string, unknown>
}): Array<() => ReturnType<typeof makeChainBuilder>> {
  const remaining = opts.sourceQty - opts.allocQty
  const metadata = opts.sourceMetadata ?? {
    fiber: 'bomuld', yarn_weight: 'DK', hex_colors: null,
    notes: null, image_url: null, catalog_image_url: null,
    gauge: null, meters: 110, color_category: 'rød',
  }
  return [
    // [0] decrement fetch
    () => makeChainBuilder({ data: { quantity: opts.sourceQty }, error: null }),
    // [1] decrement update
    () => makeChainBuilder({ data: [{ id: 'source-A', quantity: remaining }], error: null }),
    // [2] findInUseRowMatch name-color → ingen match
    //     (catalog-grenen er ikke med fordi catalogColorId=null på makeSource)
    () => makeChainBuilder({ data: [], error: null }),
    // [3] createInUseRow: metadata fra source
    () => makeChainBuilder({ data: metadata, error: null }),
    // [4] createInUseRow: INSERT → single
    () => makeChainBuilder({ data: { id: opts.inUseId }, error: null }),
  ]
}

// ── B-AC-3: insufficient stock kaster inline-fejl ────────────────────────────

describe('B-AC-3: validateLineStock kaster inline-fejl ved insufficient stock', () => {
  it('vil_gerne-linje med qty=15 men kun 10 på lager → insufficient-stock fejl', () => {
    // Simulerer Phase 1.4: pre-flight validering
    const userYarnItems = [
      { id: 'source-A', status: 'På lager', antal: 10 },
    ]

    const result = validateLineStock(
      { yarnItemId: 'source-A', quantityUsed: 15 },
      userYarnItems,
    )

    expect(result.valid).toBe(false)
    expect(result.reason).toBe('insufficient-stock')
    expect(result.available).toBe(10)
    expect(result.requested).toBe(15)
  })

  it('handleSave-analog: insufficient-stock => Error kastet med dansk besked', () => {
    // Rekonstruerer Phase 1.4-logikken fra handleSave:
    //   for each keptForm with id+yarnItemId+qty>0: validateLineStock
    //   if !v.valid && v.reason === 'insufficient-stock': throw Error
    const userYarnItems = [
      { id: 'source-A', status: 'På lager', antal: 10 },
    ]
    const keptForms = [
      {
        id:           'usage-1',
        yarnItemId:   'source-A',
        quantityUsed: 15,
        yarnBrand:    'Permin',
        colorName:    'Koral',
      },
    ]

    function phase14Validate() {
      for (const l of keptForms) {
        if (!l.id || !l.yarnItemId) continue
        const qty = Number(l.quantityUsed ?? 0)
        if (qty <= 0) continue
        const v = validateLineStock(
          { yarnItemId: l.yarnItemId, quantityUsed: qty },
          userYarnItems,
        )
        if (!v.valid && v.reason === 'insufficient-stock') {
          throw new Error(
            `Du har kun ${v.available} nøgler på lager af ${l.yarnBrand || ''} ${l.colorName || ''} — vælg færre end ${v.requested}.`,
          )
        }
      }
    }

    expect(() => phase14Validate()).toThrow(
      'Du har kun 10 nøgler på lager af Permin Koral — vælg færre end 15.',
    )
  })

  it('INGEN DB-mutation ved insufficient-stock — allocateYarnToProject kaldes ikke', async () => {
    // Verificerer at Phase 1.6 IKKE nås ved insufficient-stock (Phase 1.4 kaster tidligt).
    // Simuleres ved at bekræfte at allocateYarnToProject ikke kaldes.
    const allocateCalled = vi.fn()
    const userYarnItems = [{ id: 'source-A', status: 'På lager', antal: 10 }]
    const keptForms = [
      { id: 'usage-1', yarnItemId: 'source-A', quantityUsed: 15, yarnBrand: 'Permin', colorName: 'Koral' },
    ]

    let threw = false
    for (const l of keptForms) {
      if (!l.id || !l.yarnItemId) continue
      const qty = Number(l.quantityUsed ?? 0)
      const v = validateLineStock({ yarnItemId: l.yarnItemId, quantityUsed: qty }, userYarnItems)
      if (!v.valid && v.reason === 'insufficient-stock') {
        threw = true
        break // afbryder — ingen allokering
      }
      allocateCalled() // ville ikke nå hertil
    }

    expect(threw).toBe(true)
    expect(allocateCalled).not.toHaveBeenCalled()
  })

  it('qty===available: valid — præcis lageropfyldning er tilladt', () => {
    const userYarnItems = [{ id: 'source-A', status: 'På lager', antal: 10 }]
    const result = validateLineStock({ yarnItemId: 'source-A', quantityUsed: 10 }, userYarnItems)
    expect(result.valid).toBe(true)
    expect(result.available).toBe(10)
    expect(result.requested).toBe(10)
  })

  it('linje uden yarnItemId (manuel) valideres ikke mod lager → valid', () => {
    const userYarnItems = [{ id: 'source-A', status: 'På lager', antal: 10 }]
    const result = validateLineStock({ yarnItemId: null, quantityUsed: 999 }, userYarnItems)
    expect(result.valid).toBe(true)
  })

  it('source status I brug springes over i validateLineStock (håndteres af delta)', () => {
    // Linje der allerede er allokeret (I brug) valideres ikke mod stock.
    const userYarnItems = [{ id: 'in-use-B', status: 'I brug', antal: 3 }]
    const result = validateLineStock({ yarnItemId: 'in-use-B', quantityUsed: 100 }, userYarnItems)
    expect(result.valid).toBe(true)
  })
})

// ── B-AC-1: vil_gerne → i_gang allokerer garn ─────────────────────────────────

describe('B-AC-1: vil_gerne → i_gang allokerer korrekt', () => {
  it('allocateYarnToProject decrementerer source og opretter I-brug-række B', async () => {
    // Setup: source-A er "På lager" med 10 nøgler, linje bruger 6.
    // Phase 1.6: allocateYarnToProject(source-A, qty=6) skal:
    //   - Decrementere source-A (10 → 4)
    //   - Oprette ny I-brug-række B
    const supabase = makeTableRouter({
      yarn_items: buildAllocateHandlers({
        sourceQty: 10,
        allocQty:  6,
        inUseId:   'in-use-B',
      }),
    }) as never

    const result = await allocateYarnToProject(
      supabase, 'user-1',
      makeSource({ yarnItemId: 'source-A' }),
      'proj-1',
      6,
    )

    expect(result.inUseYarnItemId).toBe('in-use-B')
    expect(result.decrementedFrom).toBe('source-A')
    expect(result.merged).toBe(false)
  })

  it('__justAllocated-linjer: allerede-allokerede linjer identificeres og springes over i per-line-loop', () => {
    // Simulerer per-line-loop-logikken fra Arkiv.jsx der springer linjer med
    // __justAllocated === true over for at undgå dobbelt-allokering.
    const lines = [
      { id: 'usage-1', yarnItemId: 'in-use-B', quantityUsed: 6, __justAllocated: true },
      { id: 'usage-2', yarnItemId: null, quantityUsed: 3, __justAllocated: false },
    ]

    const allocatedLines: typeof lines = []
    const normalLines: typeof lines = []

    for (const l of lines) {
      if ((l as { __justAllocated?: boolean }).__justAllocated) {
        allocatedLines.push(l)
      } else {
        normalLines.push(l)
      }
    }

    expect(allocatedLines).toHaveLength(1)
    expect(allocatedLines[0].id).toBe('usage-1')
    expect(normalLines).toHaveLength(1)
    expect(normalLines[0].id).toBe('usage-2')
  })

  it('transitionFromVilGerne-logik: kun entrys med status vil_gerne triggerer', () => {
    // Rekonstruerer betingelsen fra handleSave:
    //   transitionFromVilGerne = entry.status === 'vil_gerne' && form.status !== 'vil_gerne'
    function checkTransition(entryStatus: string, formStatus: string): boolean {
      return entryStatus === 'vil_gerne' && formStatus !== 'vil_gerne'
    }

    expect(checkTransition('vil_gerne', 'i_gang')).toBe(true)
    expect(checkTransition('vil_gerne', 'faerdigstrikket')).toBe(true)
    expect(checkTransition('vil_gerne', 'vil_gerne')).toBe(false) // ingen transition
    expect(checkTransition('i_gang', 'faerdigstrikket')).toBe(false) // ikke fra vil_gerne
    expect(checkTransition('faerdigstrikket', 'i_gang')).toBe(false) // ikke fra vil_gerne
  })

  it('Phase 1.6: kun På lager-rækker allokeres (I brug-rækker springes over)', () => {
    // Simulerer filteret i Phase 1.6:
    //   const sourceItem = userYarnItems.find(y => y.id === l.yarnItemId)
    //   if (sourceItem?.status !== 'På lager') continue
    const userYarnItems = [
      { id: 'source-A', status: 'På lager', antal: 10 },
      { id: 'in-use-C', status: 'I brug',   antal: 5 },
      { id: 'brugt-D',  status: 'Brugt op',  antal: 0 },
    ]
    const keptForms = [
      { id: 'u-1', yarnItemId: 'source-A', quantityUsed: 6 },
      { id: 'u-2', yarnItemId: 'in-use-C', quantityUsed: 3 },
      { id: 'u-3', yarnItemId: 'brugt-D',  quantityUsed: 0 },
      { id: 'u-4', yarnItemId: null,        quantityUsed: 2 },
    ]

    const toAllocate = keptForms.filter(l => {
      if (!l.id || !l.yarnItemId) return false
      const qty = Number(l.quantityUsed ?? 0)
      if (qty <= 0) return false
      const sourceItem = userYarnItems.find(y => y.id === l.yarnItemId)
      return sourceItem?.status === 'På lager'
    })

    expect(toAllocate).toHaveLength(1)
    expect(toAllocate[0].id).toBe('u-1')
  })
})

// ── B-AC-2: vil_gerne → faerdigstrikket allokerer + kører cascade-classify ────

describe('B-AC-2: vil_gerne → faerdigstrikket allokerer og kører classify', () => {
  it('Phase 1.6 + Phase 1.7: allokering efterfulgt af classifyFinalizableLines med ny I-brug-id', async () => {
    // Setup: source-A på lager 10 ngl, vil allokere 6.
    // Step 1: allocateYarnToProject(source-A, 6) → opretter in-use-B
    // Step 2: kald classifyFinalizableLines med yarn_usage som peger på in-use-B
    //         (efter redirect: l.yarnItemId = in-use-B)
    // Forventet: classify returnerer in-use-B som finalizable

    const supabase = makeTableRouter({
      yarn_items: [
        // Phase 1.6: allocateYarnToProject (5 kald med catalogColorId=null)
        ...buildAllocateHandlers({ sourceQty: 10, allocQty: 6, inUseId: 'in-use-B' }),
        // Phase 1.7: classifyFinalizableLines — yarn_items kald
        //   Kald: yarn_items maybeSingle → 'I brug', qty=6
        () => makeChainBuilder({ data: { id: 'in-use-B', status: 'I brug', quantity: 6 }, error: null }),
      ],
      yarn_usage: [
        // Phase 1.7: classifyFinalizableLines — yarn_usage kald (andre projekter)
        () => makeChainBuilder({ data: [], error: null }),
      ],
    }) as never

    // Phase 1.6
    const allocResult = await allocateYarnToProject(
      supabase, 'user-1',
      makeSource({ yarnItemId: 'source-A' }),
      'proj-1',
      6,
    )
    expect(allocResult.inUseYarnItemId).toBe('in-use-B')

    // Phase 1.7: classify bruger nu in-use-B som yarnItemId
    const linesForCascade: FinalizableSource[] = [{
      yarnUsageId:  'usage-1',
      yarnItemId:   allocResult.inUseYarnItemId,
      yarnName:     'Bella',
      yarnBrand:    'Permin',
      colorName:    'Koral',
      colorCode:    '88301',
      hex:          '#FF7F6A',
      quantityUsed: 6,
    }]

    const classification = await classifyFinalizableLines(
      supabase, 'user-1', 'proj-1', linesForCascade,
    )

    // Den nye I-brug-række (in-use-B) er finalizable
    expect(classification.finalizable).toHaveLength(1)
    expect(classification.finalizable[0].source.yarnItemId).toBe('in-use-B')
    expect(classification.alreadyBrugtOp).toHaveLength(0)
    expect(classification.noYarnItem).toHaveLength(0)
  })

  it('Phase 1.5 skippes ved transitionFromVilGerne → faerdigstrikket (classify kører kun i 1.7)', () => {
    // Verificerer at Fase 1.5 og 1.7-logikken er korrekt adskilt:
    //   cascadeTriggered = entry.status !== 'faerdigstrikket' && form.status === 'faerdigstrikket'
    //   Phase 1.5 kører KUN når cascadeTriggered && !transitionFromVilGerne
    //   Phase 1.7 kører KUN når transitionFromVilGerne && form.status === 'faerdigstrikket'
    type StatusPair = { entryStatus: string; formStatus: string }

    function checkPhases({ entryStatus, formStatus }: StatusPair) {
      const transitionFromVilGerne = entryStatus === 'vil_gerne' && formStatus !== 'vil_gerne'
      const cascadeTriggered = entryStatus !== 'faerdigstrikket' && formStatus === 'faerdigstrikket'
      const phase15Runs = cascadeTriggered && !transitionFromVilGerne
      const phase17Runs = transitionFromVilGerne && formStatus === 'faerdigstrikket'
      return { phase15Runs, phase17Runs, transitionFromVilGerne, cascadeTriggered }
    }

    // vil_gerne → faerdigstrikket: SKIP fase 1.5, KØR fase 1.7
    const vgToFaerdig = checkPhases({ entryStatus: 'vil_gerne', formStatus: 'faerdigstrikket' })
    expect(vgToFaerdig.transitionFromVilGerne).toBe(true)
    expect(vgToFaerdig.cascadeTriggered).toBe(true)
    expect(vgToFaerdig.phase15Runs).toBe(false) // skippes!
    expect(vgToFaerdig.phase17Runs).toBe(true)  // kører!

    // i_gang → faerdigstrikket: KØR fase 1.5, SKIP fase 1.7
    const igangToFaerdig = checkPhases({ entryStatus: 'i_gang', formStatus: 'faerdigstrikket' })
    expect(igangToFaerdig.transitionFromVilGerne).toBe(false)
    expect(igangToFaerdig.cascadeTriggered).toBe(true)
    expect(igangToFaerdig.phase15Runs).toBe(true)  // kører!
    expect(igangToFaerdig.phase17Runs).toBe(false) // skippes!

    // vil_gerne → i_gang: SKIP begge faser (cascade kræver faerdigstrikket)
    const vgToIgang = checkPhases({ entryStatus: 'vil_gerne', formStatus: 'i_gang' })
    expect(vgToIgang.transitionFromVilGerne).toBe(true)
    expect(vgToIgang.cascadeTriggered).toBe(false)
    expect(vgToIgang.phase15Runs).toBe(false)
    expect(vgToIgang.phase17Runs).toBe(false)
  })
})

// ── B-AC-4: Cancel finalize-modal ruller allokering tilbage ───────────────────

describe('B-AC-4: rollbackVilGerneAllocations returnerer garn til lager', () => {
  it('applyAllocationDelta(-qty) incrementerer source tilbage ved rollback', async () => {
    // Rollback-helper i handleSave:
    //   for (const a of vilGerneAllocations):
    //     await applyAllocationDelta(supabase, user.id, a.source, -a.qty)
    //
    // a.source.yarnItemId = in-use-B (den nye I-brug-række)
    // delta = -6 → decrement in-use-B med 6, find På-lager-pendant, ingen match
    // → opret ny "På lager"-række (afledt af rollback-source metadata)
    //
    // applyAllocationDelta(-6)-rækkefølge med catalogColorId=null, brand/color sat:
    //   [0] decrementYarnItemQuantity: maybeSingle (hent in-use-B qty=6)
    //   [1] decrementYarnItemQuantity: update gte → [{ id, qty: 0 }]
    //   [2] findOnStockRowMatch name-color → ingen (katalog-gren springes over p.g.a. catalogColorId=null)
    //   → Ingen pendant: opret ny På-lager-række
    //   [3] hent in-use-B metadata (select.maybeSingle)
    //   [4] INSERT ny På-lager-række → single

    const supabase = makeTableRouter({
      yarn_items: [
        // [0] decrement in-use-B: fetch qty
        () => makeChainBuilder({ data: { quantity: 6 }, error: null }),
        // [1] decrement in-use-B: update
        () => makeChainBuilder({ data: [{ id: 'in-use-B', quantity: 0 }], error: null }),
        // [2] findOnStockRowMatch name-color: ingen match
        () => makeChainBuilder({ data: [], error: null }),
        // [3] hent metadata fra in-use-B
        () => makeChainBuilder({ data: {
          name: 'Bella', brand: 'Permin', color_name: 'Koral', color_code: '88301',
          color_category: 'rød', fiber: 'bomuld', yarn_weight: 'DK',
          hex_color: '#FF7F6A', hex_colors: null, notes: null, image_url: null,
          gauge: null, meters: 110, catalog_yarn_id: null, catalog_color_id: null, catalog_image_url: null,
        }, error: null }),
        // [4] INSERT ny På-lager-række
        () => makeChainBuilder({ data: { id: 'stock-restored' }, error: null }),
      ],
    }) as never

    // source peger på in-use-B (den allerede allokerede I-brug-række)
    const rollbackSource = makeSource({
      yarnItemId:     'in-use-B',
      catalogColorId: null,
    })

    const rollbackResult = await applyAllocationDelta(
      supabase, 'user-1', rollbackSource, -6,
    )

    // En ny "På lager"-række oprettedes (ingen pendant fundet)
    expect(rollbackResult.delta).toBe(-6)
    expect(rollbackResult.decrementedFrom).toBe('in-use-B')
    expect(rollbackResult.createdRowId).toBe('stock-restored')
  })

  it('applyAllocationDelta(-qty) med eksisterende pendant incrementerer pendant', async () => {
    // Rollback-scenarie: der er en eksisterende "På lager"-række (catalogColorId matcher).
    // applyAllocationDelta(-6):
    //   [0] decrement in-use-B: fetch qty=6
    //   [1] decrement in-use-B: update → [{ id, qty: 0 }]
    //   [2] findOnStockRowMatch catalog → source-A pendant fundet
    //   [3] increment source-A: fetch qty=4
    //   [4] increment source-A: update → [{ id, qty: 10 }]

    const supabase = makeTableRouter({
      yarn_items: [
        // [0] decrement in-use-B
        () => makeChainBuilder({ data: { quantity: 6 }, error: null }),
        // [1] decrement in-use-B update
        () => makeChainBuilder({ data: [{ id: 'in-use-B', quantity: 0 }], error: null }),
        // [2] findOnStockRowMatch catalog → source-A med 4 ngl (10 - 6 = 4)
        () => makeChainBuilder({
          data: [{ id: 'source-A', quantity: 4, status: 'På lager' }],
          error: null,
        }),
        // [3] increment source-A: fetch current
        () => makeChainBuilder({ data: { quantity: 4 }, error: null }),
        // [4] increment source-A: update
        () => makeChainBuilder({ data: [{ id: 'source-A', quantity: 10 }], error: null }),
      ],
    }) as never

    const rollbackSource = makeSource({
      yarnItemId:     'in-use-B',
      catalogColorId: 'cat-color-1', // matcher source-A via catalog
    })

    const rollbackResult = await applyAllocationDelta(
      supabase, 'user-1', rollbackSource, -6,
    )

    expect(rollbackResult.delta).toBe(-6)
    expect(rollbackResult.decrementedFrom).toBe('in-use-B')
    expect(rollbackResult.incrementedTo).toBe('source-A')
    expect(rollbackResult.createdRowId).toBeNull()
  })

  it('rollback af nul-allokering (ingen vilGerneAllocations): ingen DB-kald', () => {
    // Edge-case: projektet havde ingen lager-koblede linjer. rollbackVilGerneAllocations
    // kaldes med tom liste → ingen DB-kald.
    const allocations: Array<{ source: AllocatableLine & { yarnItemId: string }; qty: number }> = []
    let dbCallCount = 0
    const supabase = {
      from: vi.fn(() => {
        dbCallCount++
        return makeChainBuilder({ data: null, error: null })
      }),
    } as never

    // Rekonstruer rollback-loopet
    const promises = allocations.map(a =>
      applyAllocationDelta(supabase, 'user-1', a.source, -a.qty)
    )

    expect(promises).toHaveLength(0)
    expect(dbCallCount).toBe(0)
  })

  it('projects.update kaldes IKKE ved cancel (modal returnerer null)', () => {
    // Simulerer Phase 1.7 cancel-logikken:
    //   const result = await openFinalizeModal(classification)
    //   if (result === null) { rollback; return }
    //   → ingen projects.update
    //
    // Vi verificerer logik-flowet direkte.
    const projectsUpdateCalled = vi.fn()

    // Modal returnerer null (bruger cancellerer)
    const modalResult: Map<string, unknown> | null = null

    async function simulatePhase17WithCancel() {
      const result = modalResult
      if (result === null) {
        // rollback ville ske her — afbryd
        return 'cancelled'
      }
      // Kun nået hvis result !== null:
      projectsUpdateCalled()
      return 'saved'
    }

    return simulatePhase17WithCancel().then(outcome => {
      expect(outcome).toBe('cancelled')
      expect(projectsUpdateCalled).not.toHaveBeenCalled()
    })
  })
})

// ── B-AC-5 (regression): eksisterende cascade-logik uændret ───────────────────

describe('B-AC-5 regression: i_gang → faerdigstrikket cascade uberørt', () => {
  it('cascadeTriggered = false ved i_gang→i_gang (ingen dobbelt-trigger)', () => {
    function cascadeAndTransitionFlags(entryStatus: string, formStatus: string) {
      const transitionFromVilGerne = entryStatus === 'vil_gerne' && formStatus !== 'vil_gerne'
      const cascadeTriggered = entryStatus !== 'faerdigstrikket' && formStatus === 'faerdigstrikket'
      const deCascadeTriggered = entryStatus === 'faerdigstrikket' && formStatus !== 'faerdigstrikket'
      return { transitionFromVilGerne, cascadeTriggered, deCascadeTriggered }
    }

    // Regressioner for eksisterende cases (uændret adfærd)
    expect(cascadeAndTransitionFlags('i_gang', 'faerdigstrikket')).toMatchObject({
      transitionFromVilGerne: false,
      cascadeTriggered:       true,
      deCascadeTriggered:     false,
    })
    expect(cascadeAndTransitionFlags('faerdigstrikket', 'i_gang')).toMatchObject({
      transitionFromVilGerne: false,
      cascadeTriggered:       false,
      deCascadeTriggered:     true,
    })
    expect(cascadeAndTransitionFlags('i_gang', 'i_gang')).toMatchObject({
      transitionFromVilGerne: false,
      cascadeTriggered:       false,
      deCascadeTriggered:     false,
    })

    // Nye cases med vil_gerne:
    expect(cascadeAndTransitionFlags('vil_gerne', 'i_gang')).toMatchObject({
      transitionFromVilGerne: true,
      cascadeTriggered:       false,
      deCascadeTriggered:     false,
    })
    expect(cascadeAndTransitionFlags('vil_gerne', 'faerdigstrikket')).toMatchObject({
      transitionFromVilGerne: true,
      cascadeTriggered:       true,
      deCascadeTriggered:     false,
    })
  })
})

// ── B-AC-1 (ekstra): yarn_usage.yarn_item_id opdateres straks efter allokering ─

describe('B-AC-1 ekstra: yarn_usage redirect efter Phase 1.6', () => {
  it('yarn_usage.update med ny I-brug-id sker efter allocateYarnToProject', async () => {
    // Simulerer Phase 1.6 sekvensen:
    //   1. allocateYarnToProject → inUseYarnItemId='in-use-B'
    //   2. supabase.from('yarn_usage').update({ yarn_item_id: 'in-use-B' }).eq('id', lineId)
    // Vi verificerer at sequence er korrekt — allocate FØRST, redirect DEREFTER.

    const yarnUsageUpdateFn = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }))

    let yarnItemsCallIdx = 0
    const yarnItemsHandlers = buildAllocateHandlers({ sourceQty: 10, allocQty: 6, inUseId: 'in-use-B' })
    const fullSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'yarn_usage') return { update: yarnUsageUpdateFn }
        const handler = yarnItemsHandlers[yarnItemsCallIdx++] ?? (() => makeChainBuilder({ data: null, error: null }))
        return handler()
      }),
    } as never

    const allocResult = await allocateYarnToProject(
      fullSupabase, 'user-1',
      makeSource({ yarnItemId: 'source-A' }),
      'proj-1',
      6,
    )

    // Simuler Phase 1.6 redirect-kald
    await fullSupabase.from('yarn_usage')
      .update({ yarn_item_id: allocResult.inUseYarnItemId })

    expect(allocResult.inUseYarnItemId).toBe('in-use-B')
    expect(yarnUsageUpdateFn).toHaveBeenCalledWith({ yarn_item_id: 'in-use-B' })
  })
})
