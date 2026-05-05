/**
 * BrugNoeglerModal — Bug 2 fix (2026-05-05): allocate via shared yarn-allocate
 * helper i stedet for ad-hoc yarn_items.update.
 *
 * Korrekt opførsel POST-FIX:
 * - Source-rækkens status forbliver 'På lager' (ikke 'I brug' som før)
 * - Source decrementeres i quantity (via decrementYarnItemQuantity)
 * - En ny 'I brug'-række oprettes ELLER eksisterende merged
 * - yarn_usage peger på I-brug-rækken (ikke source)
 * - onSaved tilbagerapporterer (usageRow, newQty, sourceStatus)
 *
 * AC-1: partial brug (4→2) → source decrement til 2, ny I-brug-række oprettet, status='På lager' bevares
 * AC-2: fuld brug (4→0)    → source decrement til 0, ny I-brug-række oprettet
 * AC-3: ny projekt fra modalen oprettes med status='i_gang'
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/client', () => ({ useSupabase: vi.fn() }))
vi.mock('@/lib/supabase/mappers', () => ({
  toUsageDb: vi.fn((v: Record<string, unknown>) => ({ ...v, held_with: null })),
}))
vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(() => Promise.resolve('https://example.com/file')),
}))
vi.mock('@/lib/pdf-thumbnail', () => ({
  renderPdfFirstPage: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('@/lib/hooks/useEscapeKey', () => ({ useEscapeKey: vi.fn() }))

import { useSupabase } from '@/lib/supabase/client'
import BrugNoeglerModal from '@/components/app/BrugNoeglerModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

const sampleProject = { id: 'p1', title: 'Sweater', used_at: '2024-01-01', created_at: '2024-01-01' }

/**
 * Bygger Supabase-mock der dækker hele save-flowet POST-FIX:
 *   1. projects select (load list)
 *   2. projects select single (load details for conflict check)
 *   3. yarn_items maybeSingle (allocateYarnToProject → decrementYarnItemQuantity fetch)
 *   4. yarn_items update gte select (decrement)
 *   5. yarn_items select limit (findInUseRowMatch — no match → null)
 *   6. yarn_items select limit (findInUseRowMatch fallback — no match)
 *   7. yarn_items maybeSingle (createInUseRow fetch source metadata)
 *   8. yarn_items insert select single (createInUseRow insert new I-brug-row)
 *   9. yarn_usage insert select single (yarn_usage row)
 */
function buildMock(opts: { sourceQty: number } = { sourceQty: 4 }) {
  const yarnItemsCalls: Array<{ method: string; args?: unknown }> = []
  const yarnUsageCalls: Array<{ method: string; args?: unknown }> = []

  let yarnItemsCallCount = 0
  let projectsCallCount = 0

  const mock = {
    from: vi.fn((table: string) => {
      if (table === 'projects') {
        projectsCallCount++
        if (projectsCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq:     vi.fn().mockReturnThis(),
            in:     vi.fn().mockReturnThis(),
            order:  vi.fn().mockReturnThis(),
            limit:  vi.fn().mockResolvedValue({ data: [sampleProject], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { project_image_urls: [], pattern_image_urls: [], pattern_pdf_url: null, notes: '' },
            error: null,
          }),
        }
      }
      if (table === 'yarn_items') {
        yarnItemsCallCount++
        // Sekvens (catalog_color_id=null → kun ÉN findInUseRow-call):
        //   1: decrementYarnItemQuantity → fetch
        //   2: decrementYarnItemQuantity → update with gte
        //   3: findInUseRowMatch (brand+name+code, ingen match)
        //   4: createInUseRow → fetch source metadata
        //   5: createInUseRow → insert
        if (yarnItemsCallCount === 1) {
          return {
            select:      vi.fn().mockReturnThis(),
            eq:          vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: opts.sourceQty }, error: null }),
          }
        }
        if (yarnItemsCallCount === 2) {
          return {
            update: vi.fn((payload: unknown) => {
              yarnItemsCalls.push({ method: 'update', args: payload })
              return {
                eq: vi.fn(() => ({ eq: vi.fn(() => ({ gte: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({
                    data: [{ id: 'y1', quantity: opts.sourceQty - 2 }],
                    error: null,
                  }),
                })) })) })),
              }
            }),
          }
        }
        if (yarnItemsCallCount === 3) {
          return {
            select: vi.fn().mockReturnThis(),
            eq:     vi.fn().mockReturnThis(),
            ilike:  vi.fn().mockReturnThis(),
            limit:  vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (yarnItemsCallCount === 4) {
          return {
            select:      vi.fn().mockReturnThis(),
            eq:          vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { fiber: null, yarn_weight: null, hex_colors: null, notes: null, image_url: null },
              error: null,
            }),
          }
        }
        return {
          insert: vi.fn((rows: unknown) => {
            yarnItemsCalls.push({ method: 'insert', args: rows })
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'y-inuse-new' }, error: null }),
              })),
            }
          }),
        }
      }
      if (table === 'yarn_usage') {
        return {
          insert: vi.fn((rows: unknown) => {
            yarnUsageCalls.push({ method: 'insert', args: rows })
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'usage-new', project_id: 'p1' }, error: null }),
              })),
            }
          }),
        }
      }
      return {}
    }),
  }

  return { mock, yarnItemsCalls, yarnUsageCalls }
}

function makeYarn(antal: number) {
  return {
    id: 'y1',
    name: 'Hannah',
    brand: 'Permin',
    colorName: 'Blå',
    colorCode: '88301',
    hex: '#4A90D9',
    antal,
    status: 'På lager',
    pindstr: '4',
    catalogYarnId: null,
    catalogColorId: null,
  }
}

beforeEach(() => vi.clearAllMocks())

// ── AC-1: partial brug ────────────────────────────────────────────────────────

describe('AC-1 (POST-FIX) – partial brug bevarer source som På lager + opretter ny I-brug-række', () => {
  it('Source decrementeres (4→2), ny I-brug-række oprettes, status="På lager" bevares i onSaved', async () => {
    const user = userEvent.setup()
    const { mock, yarnItemsCalls, yarnUsageCalls } = buildMock({ sourceQty: 4 })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const onSaved = vi.fn()
    render(
      <BrugNoeglerModal
        yarn={makeYarn(4)}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    const qtyInput = screen.getByRole('spinbutton')
    await user.clear(qtyInput)
    await user.type(qtyInput, '2')

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled()
    })

    // Decrement: yarn_items.update ramt med {quantity: 2} (fra 4 - 2)
    const updateCall = yarnItemsCalls.find(c => c.method === 'update')
    expect(updateCall?.args).toEqual({ quantity: 2 })
    // Status er IKKE i update-payload — source-rækken bevarer "På lager"

    // Ny I-brug-række oprettet via insert
    const insertCall = yarnItemsCalls.find(c => c.method === 'insert')
    expect(insertCall?.args).toEqual([expect.objectContaining({
      status:   'I brug',
      quantity: 2,
      brand:    'Permin',
      color_name: 'Blå',
      color_code: '88301',
    })])

    // yarn_usage peger på den NYE I-brug-række (ikke source)
    // (toUsageDb-mock laver pass-through så feltet bevarer camelCase her)
    expect(yarnUsageCalls[0]?.args).toEqual([expect.objectContaining({
      yarnItemId: 'y-inuse-new',
    })])

    // onSaved tilbagerapporterer status='På lager' (ikke 'I brug' som pre-fix)
    expect(onSaved).toHaveBeenCalledWith(
      expect.anything(),
      2,
      'På lager',
    )
  })
})

// ── AC-2: fuld brug ───────────────────────────────────────────────────────────

describe('AC-2 (POST-FIX) – fuld brug bevarer source som På lager med quantity=0', () => {
  it('Source decrementeres (4→0), ny I-brug-række med 4 ngl oprettet, status="På lager" bevares', async () => {
    const user = userEvent.setup()

    // Bygger custom mock for fuld brug (qty=4 of 4)
    const yarnItemsCalls: Array<{ method: string; args?: unknown }> = []
    const yarnUsageCalls: Array<{ method: string; args?: unknown }> = []
    let yarnItemsCallCount = 0
    let projectsCallCount = 0
    const mock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          projectsCallCount++
          if (projectsCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [sampleProject], error: null }),
            }
          }
          return {
            select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { project_image_urls: [], pattern_image_urls: [], pattern_pdf_url: null, notes: '' },
              error: null,
            }),
          }
        }
        if (table === 'yarn_items') {
          yarnItemsCallCount++
          if (yarnItemsCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 4 }, error: null }),
            }
          }
          if (yarnItemsCallCount === 2) {
            return {
              update: vi.fn((p: unknown) => {
                yarnItemsCalls.push({ method: 'update', args: p })
                return { eq: vi.fn(() => ({ eq: vi.fn(() => ({ gte: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({ data: [{ id: 'y1', quantity: 0 }], error: null }),
                })) })) })) }
              }),
            }
          }
          if (yarnItemsCallCount === 3) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              ilike: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }
          }
          if (yarnItemsCallCount === 4) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }
          }
          return {
            insert: vi.fn((rows: unknown) => {
              yarnItemsCalls.push({ method: 'insert', args: rows })
              return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({
                data: { id: 'y-inuse-full' }, error: null,
              }) })) }
            }),
          }
        }
        if (table === 'yarn_usage') {
          return {
            insert: vi.fn((rows: unknown) => {
              yarnUsageCalls.push({ method: 'insert', args: rows })
              return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({
                data: { id: 'usage-new' }, error: null,
              }) })) }
            }),
          }
        }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const onSaved = vi.fn()
    render(
      <BrugNoeglerModal
        yarn={makeYarn(4)}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    const qtyInput = screen.getByRole('spinbutton')
    await user.clear(qtyInput)
    await user.type(qtyInput, '4')

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled()
    })

    // Source decrement til 0, status IKKE i payload
    const updateCall = yarnItemsCalls.find(c => c.method === 'update')
    expect(updateCall?.args).toEqual({ quantity: 0 })

    expect(onSaved).toHaveBeenCalledWith(expect.anything(), 0, 'På lager')
  })
})

// ── AC-3: ny projekt får status='i_gang' ──────────────────────────────────────

describe('AC-3 – ny projekt fra modalen oprettes med status=i_gang', () => {
  it('insert-payload på projects indeholder status=i_gang når mode=new', async () => {
    const user = userEvent.setup()
    const projectInsertPayloads: unknown[] = []
    const projectInsertSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'p-new' }, error: null })
    const projectInsert = vi.fn((rows: unknown) => {
      projectInsertPayloads.push(rows)
      return { select: vi.fn(() => ({ single: projectInsertSelectSingle })) }
    })

    let yarnItemsCallCount = 0
    let projectsCallCount = 0
    const supabaseMock = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'projects') {
          projectsCallCount++
          if (projectsCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }
          }
          return { insert: projectInsert }
        }
        if (table === 'yarn_usage') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'usage-new' }, error: null }),
              })),
            })),
          }
        }
        if (table === 'yarn_items') {
          yarnItemsCallCount++
          if (yarnItemsCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 4 }, error: null }),
            }
          }
          if (yarnItemsCallCount === 2) {
            return {
              update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ gte: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: [{ id: 'y1', quantity: 3 }], error: null }),
              })) })) })) })),
            }
          }
          if (yarnItemsCallCount === 3) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              ilike: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }
          }
          if (yarnItemsCallCount === 4) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }
          }
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'y-inuse-new' }, error: null }),
              })),
            })),
          }
        }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)

    render(
      <BrugNoeglerModal
        yarn={makeYarn(4)}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /arkivér nøgler/i })).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText(/F\.eks\. Bluse/i)
    await user.type(titleInput, 'Min bluse')

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(projectInsert).toHaveBeenCalled()
    })

    const insertedRow = (projectInsertPayloads[0] as Array<Record<string, unknown>>)[0]
    expect(insertedRow.status).toBe('i_gang')
    expect(insertedRow.title).toBe('Min bluse')
    expect(insertedRow.user_id).toBe('user-1')
  })
})

// ── AC-4 (NY): merge til eksisterende I-brug-række ───────────────────────────

describe('AC-4 (NY POST-FIX) – allokering merger til eksisterende I-brug-række', () => {
  it('Når der findes en matchende "I brug"-række via brand+name+code, merges quantity i stedet for at oprette ny række', async () => {
    const user = userEvent.setup()

    const yarnItemsCalls: Array<{ method: string; args?: unknown }> = []
    let yarnItemsCallCount = 0
    let projectsCallCount = 0

    const mock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          projectsCallCount++
          if (projectsCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [sampleProject], error: null }),
            }
          }
          return {
            select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { project_image_urls: [], pattern_image_urls: [], pattern_pdf_url: null, notes: '' },
              error: null,
            }),
          }
        }
        if (table === 'yarn_items') {
          yarnItemsCallCount++
          if (yarnItemsCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 12 }, error: null }),
            }
          }
          if (yarnItemsCallCount === 2) {
            return {
              update: vi.fn((p: unknown) => {
                yarnItemsCalls.push({ method: 'update-decrement', args: p })
                return { eq: vi.fn(() => ({ eq: vi.fn(() => ({ gte: vi.fn(() => ({
                  select: vi.fn().mockResolvedValue({
                    data: [{ id: 'y-source', quantity: 9.5 }], error: null,
                  }),
                })) })) })) }
              }),
            }
          }
          // findInUseRowMatch — catalogColorId=null → kun brand+name+code-call
          // som rammer eksisterende 3-ngl I-brug-række
          if (yarnItemsCallCount === 3) {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              ilike: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'y-existing-inuse', quantity: 3, status: 'I brug' }],
                error: null,
              }),
            }
          }
          // Merge-update: quantity 3 → 5.5
          return {
            update: vi.fn((p: unknown) => {
              yarnItemsCalls.push({ method: 'update-merge', args: p })
              return { eq: vi.fn(() => ({ eq: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: [{ id: 'y-existing-inuse' }], error: null }),
              })) })) }
            }),
          }
        }
        if (table === 'yarn_usage') {
          return {
            insert: vi.fn((rows: unknown) => {
              yarnItemsCalls.push({ method: 'usage-insert', args: rows })
              return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({
                data: { id: 'usage-new' }, error: null,
              }) })) }
            }),
          }
        }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const onSaved = vi.fn()
    render(
      <BrugNoeglerModal
        yarn={makeYarn(12)}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    )

    await waitFor(() => { expect(screen.getByRole('combobox')).toBeInTheDocument() })

    const qtyInput = screen.getByRole('spinbutton')
    await user.clear(qtyInput)
    await user.type(qtyInput, '2.5')

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => { expect(onSaved).toHaveBeenCalled() })

    // Source decrement: 12 → 9.5
    const decrementCall = yarnItemsCalls.find(c => c.method === 'update-decrement')
    expect(decrementCall?.args).toEqual({ quantity: 9.5 })

    // Merge-update: eksisterende I-brug-række får quantity 3+2.5=5.5
    const mergeCall = yarnItemsCalls.find(c => c.method === 'update-merge')
    expect(mergeCall?.args).toEqual({ quantity: 5.5 })

    // yarn_usage peger på den EKSISTERENDE I-brug-række (merged)
    const usageCall = yarnItemsCalls.find(c => c.method === 'usage-insert')
    expect(usageCall?.args).toEqual([expect.objectContaining({
      yarnItemId: 'y-existing-inuse',
    })])

    // onSaved: status forbliver 'På lager'
    expect(onSaved).toHaveBeenCalledWith(expect.anything(), 9.5, 'På lager')
  })
})
