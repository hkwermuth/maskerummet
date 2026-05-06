/**
 * Unit tests for lib/yarn-allocate.ts
 * Covers: AC-1 (allokering), AC-2 (split), AC-13 (race-safe decrement)
 *
 * Alle Supabase-kald er mocket — ingen rigtig DB-hit.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  findInUseRowMatch,
  decrementYarnItemQuantity,
  allocateYarnToProject,
  splitYarnItemRow,
  validateLineStock,
} from '@/lib/yarn-allocate'
import type { AllocatableLine } from '@/lib/yarn-allocate'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLine(overrides: Partial<AllocatableLine> = {}): AllocatableLine {
  return {
    yarnItemId:     null,
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

const SOURCE_ROW = {
  id: 'src-1',
  quantity: 8,
  name: 'Bella',
  brand: 'Permin',
  color_name: 'Koral',
  color_code: '88301',
  color_category: 'rød',
  hex_color: '#FF7F6A',
  hex_colors: null,
  fiber: 'bomuld',
  yarn_weight: 'DK',
  notes: null,
  image_url: null,
  gauge: null,
  meters: 110,
  status: 'På lager',
  catalog_yarn_id: null,
  catalog_color_id: null,
  catalog_image_url: null,
  barcode: null,
}

const IN_USE_ROW = {
  id: 'in-use-1',
  quantity: 2,
  status: 'I brug',
}

// ── findInUseRowMatch ─────────────────────────────────────────────────────────

describe('findInUseRowMatch', () => {
  it('returnerer match med matchKind=by-catalog-color når en I-brug-række matcher catalog_color_id', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [IN_USE_ROW], error: null }),
      })),
    } as never

    const line = makeLine({ catalogColorId: 'cat-color-1' })
    const result = await findInUseRowMatch(supabase, 'user-1', line)

    expect(result).not.toBeNull()
    expect(result!.matchKind).toBe('by-catalog-color')
    expect(result!.yarnItemId).toBe('in-use-1')
    expect(result!.currentQuantity).toBe(2)
  })

  it('falder tilbage til by-name-color når catalog_color_id ikke matcher', async () => {
    let callCount = 0
    const ilikeFn = vi.fn().mockReturnThis()
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: ilikeFn,
          limit: vi.fn().mockResolvedValue({ data: [IN_USE_ROW], error: null }),
        }
      }),
    } as never

    const line = makeLine({ catalogColorId: 'cat-color-1' })
    const result = await findInUseRowMatch(supabase, 'user-1', line)

    expect(result!.matchKind).toBe('by-name-color')
    expect(ilikeFn).toHaveBeenCalledWith('brand', 'Permin')
    expect(ilikeFn).toHaveBeenCalledWith('color_name', 'Koral')
    expect(ilikeFn).toHaveBeenCalledWith('color_code', '88301')
  })

  it('returnerer null når intet matcher', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as never

    const line = makeLine({ catalogColorId: 'cat-color-1' })
    const result = await findInUseRowMatch(supabase, 'user-1', line)

    expect(result).toBeNull()
  })

  it('hopper name-color-fallback over når brand er tomt', async () => {
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }),
    } as never

    const line = makeLine({ catalogColorId: null, yarnBrand: '' })
    const result = await findInUseRowMatch(supabase, 'user-1', line)

    expect(result).toBeNull()
    expect(callCount).toBe(0) // ingen branch trigger uden catalog_color_id og uden brand
  })
})

// ── decrementYarnItemQuantity ────────────────────────────────────────────────

describe('decrementYarnItemQuantity – AC-13 race-safe', () => {
  it('decrementer quantity og returnerer ny værdi', async () => {
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 8 }, error: null }),
          }
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [{ id: 'src-1', quantity: 5 }], error: null }),
                })),
              })),
            })),
          })),
        }
      }),
    } as never

    const newQty = await decrementYarnItemQuantity(supabase, 'user-1', 'src-1', 3)
    expect(newQty).toBe(5)
  })

  it('kaster fejl ved utilstrækkeligt antal på lager (AC-13: 8 < 10)', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 8 }, error: null }),
      })),
    } as never

    await expect(decrementYarnItemQuantity(supabase, 'user-1', 'src-1', 10))
      .rejects.toThrow(/utilstrækkeligt antal/)
  })

  it('kaster fejl hvis source-rækken ikke findes', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as never

    await expect(decrementYarnItemQuantity(supabase, 'user-1', 'missing', 1))
      .rejects.toThrow(/source-rækken findes ikke/)
  })

  it('kaster race-fejl hvis update rammer 0 rækker', async () => {
    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 8 }, error: null }),
          }
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          })),
        }
      }),
    } as never

    await expect(decrementYarnItemQuantity(supabase, 'user-1', 'src-1', 3))
      .rejects.toThrow(/race detected/)
  })

  it('afviser qty <= 0', async () => {
    const supabase = { from: vi.fn() } as never
    await expect(decrementYarnItemQuantity(supabase, 'user-1', 'src-1', 0))
      .rejects.toThrow(/qty skal være > 0/)
    await expect(decrementYarnItemQuantity(supabase, 'user-1', 'src-1', -1))
      .rejects.toThrow(/qty skal være > 0/)
  })
})

// ── allocateYarnToProject ────────────────────────────────────────────────────

describe('allocateYarnToProject – AC-1', () => {
  it('decrementer source og opretter ny I-brug-række når intet match findes', async () => {
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'in-use-new' }, error: null })

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          // decrementYarnItemQuantity → fetch current quantity
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 8 }, error: null }),
          }
        }
        if (callCount === 2) {
          // decrementYarnItemQuantity → update with gte race-guard
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    select: vi.fn().mockResolvedValue({ data: [{ id: 'src-1', quantity: 5 }], error: null }),
                  })),
                })),
              })),
            })),
          }
        }
        if (callCount === 3) {
          // findInUseRowMatch → no catalog_color_id; falls through to name-color match (no hits)
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (callCount === 4) {
          // createInUseRow → fetch source metadata
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: SOURCE_ROW, error: null }),
          }
        }
        // createInUseRow → INSERT new I-brug row
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: insertSingleFn })),
          })),
        }
      }),
    } as never

    const source = { ...makeLine(), yarnItemId: 'src-1' }
    const result = await allocateYarnToProject(supabase, 'user-1', source, 'proj-1', 3)

    expect(result.inUseYarnItemId).toBe('in-use-new')
    expect(result.decrementedFrom).toBe('src-1')
    expect(result.merged).toBe(false)
    expect(insertSingleFn).toHaveBeenCalled()
  })

  it('merger til eksisterende I-brug-række når match findes (AC-6 dup-merge ved allokering)', async () => {
    // Kald-rækkefølge (merge-gren med catalogColorId):
    //   1: decrementYarnItemQuantity fetch maybeSingle
    //   2: decrementYarnItemQuantity update gte
    //   3: findInUseRowMatch catalog limit
    //   4: UPDATE I-brug-raekken (forøg quantity)
    //   5: backfillMetadataFromSource: source maybeSingle (Promise.all)
    //   6: backfillMetadataFromSource: target maybeSingle (Promise.all)
    //   [ingen 7: ingen felter at backfille → ingen backfill-update]
    const updateSelectFn = vi.fn().mockResolvedValue({ data: [{ id: 'in-use-1' }], error: null })
    const nullMetadata = {
      image_url: null, fiber: null, yarn_weight: null, hex_colors: null,
      gauge: null, meters: null, notes: null, color_category: null, catalog_image_url: null,
    }

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 8 }, error: null }),
          }
        }
        if (callCount === 2) {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    select: vi.fn().mockResolvedValue({ data: [{ id: 'src-1', quantity: 5 }], error: null }),
                  })),
                })),
              })),
            })),
          }
        }
        if (callCount === 3) {
          // findInUseRowMatch: catalog match
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [IN_USE_ROW], error: null }),
          }
        }
        if (callCount === 4) {
          // UPDATE I-brug-raekken (forøg quantity)
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: updateSelectFn,
                })),
              })),
            })),
          }
        }
        // kald 5+6: backfillMetadataFromSource reads (Promise.all parallel)
        // begge returnerer null-metadata → ingen backfill-update
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: nullMetadata, error: null }),
        }
      }),
    } as never

    const source = { ...makeLine({ catalogColorId: 'cat-color-1' }), yarnItemId: 'src-1' }
    const result = await allocateYarnToProject(supabase, 'user-1', source, 'proj-1', 3)

    expect(result.inUseYarnItemId).toBe('in-use-1')
    expect(result.merged).toBe(true)
    expect(updateSelectFn).toHaveBeenCalled()
  })

  it('afviser qty <= 0', async () => {
    const supabase = { from: vi.fn() } as never
    const source = { ...makeLine(), yarnItemId: 'src-1' }
    await expect(allocateYarnToProject(supabase, 'user-1', source, 'proj-1', 0))
      .rejects.toThrow(/qty skal være > 0/)
  })

  it('Bella Koral-bug: 8 på lager, allokér 10 → fejler (AC-3 validering håndhæves i lib)', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 8 }, error: null }),
      })),
    } as never

    const source = { ...makeLine(), yarnItemId: 'src-1' }
    await expect(allocateYarnToProject(supabase, 'user-1', source, 'proj-1', 10))
      .rejects.toThrow(/utilstrækkeligt antal/)
  })
})

// ── splitYarnItemRow ─────────────────────────────────────────────────────────

describe('splitYarnItemRow – AC-2', () => {
  it('splitter rækken: 5 ud af 10 ngl flyttes til ny status, kopierer metadata', async () => {
    const insertCaptured = vi.fn()
    const insertSingleFn = vi.fn().mockResolvedValue({ data: { id: 'new-1' }, error: null })

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          // Hent fuld source-row
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...SOURCE_ROW, quantity: 10 },
              error: null,
            }),
          }
        }
        if (callCount === 2) {
          // decrement → fetch current
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 10 }, error: null }),
          }
        }
        if (callCount === 3) {
          // decrement → update with gte
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    select: vi.fn().mockResolvedValue({ data: [{ id: 'src-1', quantity: 5 }], error: null }),
                  })),
                })),
              })),
            })),
          }
        }
        // INSERT ny række
        return {
          insert: (payload: unknown) => {
            insertCaptured(payload)
            return {
              select: vi.fn(() => ({ single: insertSingleFn })),
            }
          },
        }
      }),
    } as never

    const result = await splitYarnItemRow(supabase, 'user-1', 'src-1', 5, 'I brug')

    expect(result.sourceYarnItemId).toBe('src-1')
    expect(result.newYarnItemId).toBe('new-1')
    expect(insertCaptured).toHaveBeenCalledWith([expect.objectContaining({
      user_id:        'user-1',
      quantity:       5,
      status:         'I brug',
      brand:          'Permin',
      color_name:     'Koral',
      color_code:     '88301',
      color_category: 'rød',
      fiber:          'bomuld',
      yarn_weight:    'DK',
    })])
  })

  it('quantity === total: ingen split, kun status-update på source', async () => {
    const updateCaptured = vi.fn()

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...SOURCE_ROW, quantity: 5 },
              error: null,
            }),
          }
        }
        return {
          update: (payload: unknown) => {
            updateCaptured(payload)
            return {
              eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
            }
          },
        }
      }),
    } as never

    const result = await splitYarnItemRow(supabase, 'user-1', 'src-1', 5, 'I brug')

    expect(result.sourceYarnItemId).toBe('src-1')
    expect(result.newYarnItemId).toBe('src-1')
    expect(updateCaptured).toHaveBeenCalledWith({ status: 'I brug' })
  })

  it('quantity > total: kaster fejl', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...SOURCE_ROW, quantity: 3 },
          error: null,
        }),
      })),
    } as never

    await expect(splitYarnItemRow(supabase, 'user-1', 'src-1', 5, 'I brug'))
      .rejects.toThrow(/source har kun 3, kan ikke splitte 5/)
  })

  it('extraOnNew følger med på den nye række (fx brugt_til_projekt_id)', async () => {
    const insertCaptured = vi.fn()

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...SOURCE_ROW, quantity: 10 },
              error: null,
            }),
          }
        }
        if (callCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 10 }, error: null }),
          }
        }
        if (callCount === 3) {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    select: vi.fn().mockResolvedValue({ data: [{ id: 'src-1', quantity: 7 }], error: null }),
                  })),
                })),
              })),
            })),
          }
        }
        return {
          insert: (payload: unknown) => {
            insertCaptured(payload)
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'new-1' }, error: null }),
              })),
            }
          },
        }
      }),
    } as never

    await splitYarnItemRow(supabase, 'user-1', 'src-1', 3, 'I brug', {
      brugt_til_projekt_id: 'proj-1',
    })

    expect(insertCaptured).toHaveBeenCalledWith([expect.objectContaining({
      brugt_til_projekt_id: 'proj-1',
    })])
  })

  it('afviser qty <= 0', async () => {
    const supabase = { from: vi.fn() } as never
    await expect(splitYarnItemRow(supabase, 'user-1', 'src-1', 0, 'I brug'))
      .rejects.toThrow(/qty skal være > 0/)
  })
})

// ── validateLineStock ────────────────────────────────────────────────────────

describe('validateLineStock – AC-3 picker-validering', () => {
  const items = [
    { id: 'a', status: 'På lager', antal: 8 },
    { id: 'b', status: 'I brug',   antal: 3 },
    { id: 'c', status: 'Brugt op', antal: 0 },
  ]

  it('valid når line ikke har yarnItemId (manuel/katalog)', () => {
    const r = validateLineStock({ yarnItemId: null, quantityUsed: 5 }, items)
    expect(r.valid).toBe(true)
  })

  it('invalid (no-source) når yarnItemId ikke findes i userYarnItems', () => {
    const r = validateLineStock({ yarnItemId: 'missing', quantityUsed: 1 }, items)
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('no-source')
  })

  it('valid når På lager-source har nok antal', () => {
    const r = validateLineStock({ yarnItemId: 'a', quantityUsed: 5 }, items)
    expect(r.valid).toBe(true)
    expect(r.available).toBe(8)
    expect(r.requested).toBe(5)
  })

  it('Bella Koral: invalid når requested > available på På lager-row', () => {
    const r = validateLineStock({ yarnItemId: 'a', quantityUsed: 10 }, items)
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('insufficient-stock')
    expect(r.available).toBe(8)
    expect(r.requested).toBe(10)
  })

  it('valid for I brug-source uden mængde-check (delta håndteres i Arkiv)', () => {
    const r = validateLineStock({ yarnItemId: 'b', quantityUsed: 100 }, items)
    expect(r.valid).toBe(true)
  })
})

// ── KAT-AC-1: catalog_image_url kopieres ved createInUseRow ─────────────────
//
// Bug 6.5 (2026-05-06): createInUseRow manglede catalog_image_url i sin select
// og insert, så den nye I-brug-rækkes yarn-kort viste farve i stedet for billede.
// Testen verificerer at catalog_image_url fra source-rækken følger med til den
// nye I-brug-række.

describe('KAT-AC-1: createInUseRow kopierer catalog_image_url fra source', () => {
  it('ny I-brug-række arverer catalog_image_url=cat.jpg fra source-rækken', async () => {
    // allocateYarnToProject createInUseRow-gren (ingen eksisterende I-brug-match).
    // Source har catalogColorId=null, men brand+colorName+colorCode er sat.
    //
    // Kald-rækkefølge (catalogColorId=null → ingen catalog-branch i findInUseRowMatch):
    //   [1] decrement: fetch current qty (maybeSingle)
    //   [2] decrement: update gte
    //   [3] findInUseRowMatch name-color → [] (ingen match)
    //   [4] createInUseRow: metadata fra source (maybeSingle) → catalog_image_url='cat.jpg'
    //   [5] createInUseRow: INSERT → select → single
    const insertCaptured = vi.fn()

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          // decrement: fetch current qty
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 10 }, error: null }),
          }
        }
        if (callCount === 2) {
          // decrement: update gte
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    select: vi.fn().mockResolvedValue({ data: [{ id: 'src-1', quantity: 4 }], error: null }),
                  })),
                })),
              })),
            })),
          }
        }
        if (callCount === 3) {
          // findInUseRowMatch: name-color → ingen match
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (callCount === 4) {
          // createInUseRow: metadata fra source (catalog_image_url='cat.jpg')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                fiber: 'bomuld',
                yarn_weight: 'DK',
                hex_colors: null,
                notes: null,
                image_url: null,
                catalog_image_url: 'cat.jpg',
                gauge: null,
                meters: 110,
                color_category: 'rød',
              },
              error: null,
            }),
          }
        }
        // callCount === 5: createInUseRow INSERT
        return {
          insert: (payload: unknown) => {
            insertCaptured(payload)
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'in-use-new' }, error: null }),
              })),
            }
          },
        }
      }),
    } as never

    const source = {
      ...makeLine({ catalogColorId: null }),
      yarnItemId: 'src-1',
    }
    const result = await allocateYarnToProject(supabase, 'user-1', source, 'proj-1', 6)

    expect(result.inUseYarnItemId).toBe('in-use-new')
    expect(result.merged).toBe(false)

    // KERNE: catalog_image_url skal være 'cat.jpg' i INSERT-payloaden
    expect(insertCaptured).toHaveBeenCalledWith([expect.objectContaining({
      catalog_image_url: 'cat.jpg',
    })])
  })

  it('createInUseRow bevarer catalog_image_url=null når source ikke har det', async () => {
    // Verificerer at null-værdien propageres korrekt (ingen undefined-fejl).
    // Kald-rækkefølge identisk med ovenstående, blot catalog_image_url=null.
    const insertCaptured = vi.fn()

    let callCount = 0
    const supabase = {
      from: vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 8 }, error: null }),
          }
        }
        if (callCount === 2) {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    select: vi.fn().mockResolvedValue({ data: [{ id: 'src-1', quantity: 2 }], error: null }),
                  })),
                })),
              })),
            })),
          }
        }
        if (callCount === 3) {
          // findInUseRowMatch: name-color → ingen match
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (callCount === 4) {
          // createInUseRow: metadata fra source (ingen catalog_image_url)
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                fiber: null, yarn_weight: null, hex_colors: null,
                notes: null, image_url: null, catalog_image_url: null,
                gauge: null, meters: null, color_category: null,
              },
              error: null,
            }),
          }
        }
        // callCount === 5: createInUseRow INSERT
        return {
          insert: (payload: unknown) => {
            insertCaptured(payload)
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'in-use-2' }, error: null }),
              })),
            }
          },
        }
      }),
    } as never

    const source = { ...makeLine({ catalogColorId: null }), yarnItemId: 'src-1' }
    const result = await allocateYarnToProject(supabase, 'user-1', source, 'proj-1', 6)

    expect(result.inUseYarnItemId).toBe('in-use-2')
    expect(insertCaptured).toHaveBeenCalledWith([expect.objectContaining({
      catalog_image_url: null,
    })])
  })
})
