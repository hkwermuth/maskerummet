/**
 * AC-1: partial brug (4→2 nøgler) → status='På lager', quantity=2
 * AC-2: fuld brug (4→0 nøgler)    → status='I brug',   quantity=0
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

function buildMock() {
  const updateEqFn = vi.fn().mockResolvedValue({ data: null, error: null })
  const updateFn = vi.fn(() => ({ eq: updateEqFn }))

  let projectsSelectCallCount = 0

  return {
    mock: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'projects') {
          projectsSelectCallCount++
          // First call: load project list (select → eq → in → order → order → limit)
          if (projectsSelectCallCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [sampleProject], error: null }),
            }
          }
          // Second call: load project details for conflict check (select → eq → single)
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { project_image_urls: [], pattern_image_urls: [], pattern_pdf_url: null, notes: '' },
              error: null,
            }),
          }
        }
        if (table === 'yarn_usage') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'usage-new', project_id: 'p1' }, error: null }),
              })),
            })),
          }
        }
        if (table === 'yarn_items') {
          return { update: updateFn }
        }
        return {}
      }),
    },
    updateFn,
    updateEqFn,
  }
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

describe('AC-1 – partial brug sætter status=På lager', () => {
  it('gemmer quantity=2 og status=På lager når 2 ud af 4 nøgler bruges', async () => {
    const user = userEvent.setup()
    const { mock, updateFn, updateEqFn } = buildMock()
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

    // Wait for project list to load (select is populated)
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    // Project p1 is already selected in the combobox (first option)
    // Fill in quantity used = 2 (spinbutton is the number input for quantity)
    const qtyInput = screen.getByRole('spinbutton')
    await user.clear(qtyInput)
    await user.type(qtyInput, '2')

    // Submit button is labelled "Arkivér nøgler"
    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(updateFn).toHaveBeenCalledWith({ quantity: 2, status: 'På lager' })
    })

    // Callback receives new qty and status
    expect(onSaved).toHaveBeenCalledWith(
      expect.anything(),
      2,
      'På lager',
    )
  })
})

// ── AC-2: fuld brug ───────────────────────────────────────────────────────────

describe('AC-2 – fuld brug sætter status=I brug', () => {
  it('gemmer quantity=0 og status=I brug når alle 4 nøgler bruges', async () => {
    const user = userEvent.setup()
    const { mock, updateFn } = buildMock()
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
      expect(updateFn).toHaveBeenCalledWith({ quantity: 0, status: 'I brug' })
    })

    expect(onSaved).toHaveBeenCalledWith(
      expect.anything(),
      0,
      'I brug',
    )
  })
})
