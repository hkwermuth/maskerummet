/**
 * Supplerende tests — daekker huller identificeret under coverage-review:
 *
 * 1. Cascade-then-revert med split: bruger markerer 1 af 2 yarn_usage som Brugt op
 *    via finalizeYarnLines (qty < total => split => ny Brugt op-raekke). Derefter
 *    revertCascadedYarns finder den splittede raekke via brugt_til_projekt_id og
 *    restaurerer quantity korrekt.
 *
 * 2. Insufficient stock i BrugNoeglerModal: validateLineStock blokerer paent
 *    nar requested > available (UI-side validering inden allocateYarnToProject).
 *
 * Disse tests supplerer eksisterende daaekning — ingen duplikat af allerede
 * daekkede scenarier.
 *
 * Opdateret til ny FinalizeDecision union-form:
 *   { kind: 'brugt-op' } | { kind: 'behold'; keepOnStock: number }
 */

import { describe, it, expect, vi } from 'vitest'
import { finalizeYarnLines, revertCascadedYarns } from '@/lib/yarn-finalize'
import { validateLineStock } from '@/lib/yarn-allocate'
import type { FinalizableEntry, FinalizableSource, FinalizeDecision } from '@/lib/yarn-finalize'

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

function makeSource(overrides: Partial<FinalizableSource> = {}): FinalizableSource {
  return {
    yarnUsageId:  'usage-1',
    yarnItemId:   'yarn-merged',
    yarnName:     'Drops Safran',
    yarnBrand:    'Drops',
    colorName:    'Navy',
    colorCode:    '16',
    hex:          '#1B2A4A',
    quantityUsed: 3,
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

// ── Cascade-then-revert med split ─────────────────────────────────────────────
//
// Scenario: merged I-brug-raekke har 5 ngl (usage-1=3 + usage-2=2).
// Bruger markerer kun usage-1 (3 ngl) som Brugt op.
// finalizeYarnLines splitter => source decrementeres til 2, ny Brugt op-raekke
// ('yarn-brugtop-3ngl') med quantity=3 (Bug 5 datamodel — bevarer det forbrugte
// antal) og brugt_til_projekt_id='proj-1' oprettes, yarn_usage-1 redirectes til
// ny raekke.
//
// Derefter: projekt skifter status fra faerdigstrikket => i_gang.
// revertCascadedYarns finder 'yarn-brugtop-3ngl' via brugt_til_projekt_id
// og restaurerer quantity=3 (fra raekkens egen quantity, fallback til
// yarn_usage-SUM for legacy quantity=0-raekker).

describe('Cascade-then-revert med split: 1 af 2 yarn_usage markeres Brugt op, revert restaurerer korrekt', () => {
  it('finalizeYarnLines splitter merged I-brug-raekke korrekt (qty=3 < total=5)', async () => {
    const insertCaptured = vi.fn()
    let callCount = 0

    const supabase = {
      from: vi.fn(() => {
        callCount++
        // 1: splitYarnItemRow fetch source row
        if (callCount === 1) return makeThenableBuilder({
          data: {
            id: 'yarn-merged', quantity: 5,
            name: 'Drops Safran', brand: 'Drops', color_name: 'Navy', color_code: '16',
            hex_color: '#1B2A4A',
          },
          error: null,
        })
        // 2: decrementYarnItemQuantity fetch current
        if (callCount === 2) return makeThenableBuilder({ data: { quantity: 5 }, error: null })
        // 3: decrementYarnItemQuantity update gte (race-safe)
        if (callCount === 3) return makeThenableBuilder({
          data: [{ id: 'yarn-merged', quantity: 2 }], error: null,
        })
        // 4: insert ny Brugt op-raekke
        if (callCount === 4) {
          const b = makeThenableBuilder({ data: { id: 'yarn-brugtop-3ngl' }, error: null })
          b.insert = vi.fn((payload: unknown) => {
            insertCaptured(payload)
            return b
          })
          return b
        }
        // 5: yarn_usage redirect update
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([['usage-1', { kind: 'brugt-op' }]])
    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [makeEntry()],
      decisions,
      'Stribet Cardigan', 'proj-1', '2026-05-04',
    )

    // Ny Brugt op-raekke oprettet, yarn_usage redirectet
    expect(result.markedBrugtOp).toEqual(['yarn-brugtop-3ngl'])

    // Bug 5 (2026-05-05): insert har quantity=3 (det forbrugte antal), ikke 0.
    expect(insertCaptured).toHaveBeenCalledWith([expect.objectContaining({
      status:               'Brugt op',
      quantity:             3,
      brugt_til_projekt_id: 'proj-1',
    })])
  })

  it('revertCascadedYarns finder splittede Brugt op-raekke via UUID og restaurerer quantity=3', async () => {
    // Simulerer tilstand EFTER split: 'yarn-brugtop-3ngl' har:
    //   - status='Brugt op', quantity=0, brugt_til_projekt_id='proj-1'
    // yarn_usage for proj-1 har quantity_used=3 (usage-1 der redirectedes).
    // Source 'yarn-merged' er IKKE Brugt op, berores ikke af revert.
    //
    // revertCascadedYarns query-sekvens (med Pa lager-query som nyt kald #3):
    //   1: UUID-match => finder 'yarn-brugtop-3ngl'
    //   2: title-fallback => ingen (allerede fundet)
    //   3: Pa lager med brugt_til_projekt_id => ingen
    //   4: sum yarn_usage for 'yarn-brugtop-3ngl'
    //   5: update til I brug
    const updateBuilder = makeThenableBuilder({ data: null, error: null })
    let callCount = 0

    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) return makeThenableBuilder({
          data:  [{ id: 'yarn-brugtop-3ngl', catalog_color_id: null, brand: 'Drops', color_name: 'Navy', color_code: '16' }],
          error: null,
        })  // UUID-match
        if (callCount === 2) return makeThenableBuilder({ data: [], error: null })  // title-fallback
        if (callCount === 3) return makeThenableBuilder({ data: [], error: null })  // Pa lager: ingen
        if (callCount === 4) return makeThenableBuilder({
          data:  [{ quantity_used: 3 }],
          error: null,
        })  // yarn_usage sum
        return updateBuilder  // update
      }),
    } as never

    const result = await revertCascadedYarns(supabase, 'user-1', 'proj-1', 'Stribet Cardigan')

    expect(result.reverted).toEqual(['yarn-brugtop-3ngl'])
    // Quantity restaureres til 3 (sum af yarn_usage), ikke 0
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status:               'I brug',
      quantity:             3,
      brugt_til_projekt:    null,
      brugt_til_projekt_id: null,
      brugt_op_dato:        null,
    })
  })

  it('usage-2-linjen (behold-full) kalder lager-split (ingen Brugt op-kald)', async () => {
    // Verificerer at { kind: 'behold', keepOnStock: 2 } med total=2 giver
    // behold-full-path (kun lager-split, ingen brugt-op-split).
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        // lager-split: 1=fetch source, 2=update source
        if (callCount === 1) return makeThenableBuilder({
          data: { id: 'yarn-merged', quantity: 2, name: 'Drops Safran', brand: 'Drops' }, error: null,
        })
        return makeThenableBuilder({ data: null, error: null })
      }),
    } as never

    const decisions = new Map<string, FinalizeDecision>([
      ['usage-2', { kind: 'behold', keepOnStock: 2 }],
    ])

    const result = await finalizeYarnLines(
      supabase, 'user-1',
      [makeEntry({ source: makeSource({ yarnUsageId: 'usage-2', quantityUsed: 2 }) })],
      decisions,
      'Stribet Cardigan', 'proj-1', '2026-05-04',
    )

    expect(result.markedBrugtOp).toEqual([])
    expect(result.keptOnStock).toEqual(['yarn-merged'])
    // 2 kald: lager-split fetch + update
    expect(callCount).toBe(2)
  })
})

// ── Insufficient stock i BrugNoeglerModal: validateLineStock ──────────────────
//
// BrugNoeglerModal.save korer validateLineStock client-side INDEN allocateYarnToProject.
// Verificerer at lib-funktionen blokerer korrekt og returnerer fejl-detaljer.

describe('validateLineStock: insufficient stock blokerer allokering (BrugNoeglerModal-guard)', () => {
  const items = [{ id: 'y1', status: 'På lager', antal: 4 }]

  it('qty > antal => invalid med reason=insufficient-stock + korrekte tal', () => {
    const r = validateLineStock({ yarnItemId: 'y1', quantityUsed: 5 }, items)
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('insufficient-stock')
    expect(r.available).toBe(4)
    expect(r.requested).toBe(5)
  })

  it('qty === antal => valid (graensetilfaelde: praecis antal er tilladt)', () => {
    const r = validateLineStock({ yarnItemId: 'y1', quantityUsed: 4 }, items)
    expect(r.valid).toBe(true)
  })

  it('qty < antal => valid', () => {
    const r = validateLineStock({ yarnItemId: 'y1', quantityUsed: 2.5 }, items)
    expect(r.valid).toBe(true)
    expect(r.available).toBe(4)
    expect(r.requested).toBe(2.5)
  })

  it('yarnItemId=null (manuel linje) => always valid, ingen stock-check', () => {
    const r = validateLineStock({ yarnItemId: null, quantityUsed: 999 }, items)
    expect(r.valid).toBe(true)
  })

  it('yarnItemId ikke i items => reason=no-source (garnet er slettet eller brugt op)', () => {
    const r = validateLineStock({ yarnItemId: 'y-gone', quantityUsed: 1 }, items)
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('no-source')
  })

  it('I-brug-source: stock-check springes over (delta haandteres separat)', () => {
    const inUseItems = [{ id: 'y2', status: 'I brug', antal: 2 }]
    // Selv 100 requested accepteres for I brug — ingen maengde-blokering her
    const r = validateLineStock({ yarnItemId: 'y2', quantityUsed: 100 }, inUseItems)
    expect(r.valid).toBe(true)
  })
})
