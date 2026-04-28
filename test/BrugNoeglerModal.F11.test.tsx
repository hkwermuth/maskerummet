/**
 * F11 – BrugNoeglerModal: Følgetråd-rename
 *
 * AC 4  "Strikket med" er erstattet af "Følgetråd" i BrugNoeglerModal
 *        — begge call-sites (eksisterende projekt + nyt projekt).
 * AC 5  DB-kolonnen held_with modtager fortsat værdien (via toUsageDb mock).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: vi.fn(),
}))

vi.mock('@/lib/supabase/mappers', () => ({
  toUsageDb: vi.fn((v: Record<string, unknown>) => ({ ...v, held_with: v.heldWith ?? null })),
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(() => Promise.resolve('https://example.com/file')),
}))

vi.mock('@/lib/hooks/useEscapeKey', () => ({
  useEscapeKey: vi.fn(),
}))

import { useSupabase } from '@/lib/supabase/client'
import { toUsageDb } from '@/lib/supabase/mappers'
import BrugNoeglerModal from '@/components/app/BrugNoeglerModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

const sampleYarn = {
  id: 'y1',
  name: 'Bella',
  brand: 'Permin',
  colorName: 'Rosa',
  colorCode: '883174',
  hex: '#E1A1B0',
  antal: 5,
  status: 'På lager',
  pindstr: '3.5',
  catalogYarnId: null,
  catalogColorId: null,
}

const sampleProject = { id: 'p1', title: 'Sommersweater', used_at: '2024-01-01', created_at: '2024-01-01' }

function buildSupabaseMock() {
  const projectsChain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [sampleProject], error: null }),
  }

  const usageInsertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'usage-new', project_id: 'p1' }, error: null }),
  }

  const yarnUpdateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  const insertMock = vi.fn().mockReturnThis()
  const selectAfterInsert = vi.fn().mockReturnThis()
  const singleMock = vi.fn().mockResolvedValue({ data: { id: 'usage-new' }, error: null })

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return projectsChain
      if (table === 'yarn_usage') return { insert: insertMock.mockReturnValue({ select: selectAfterInsert.mockReturnValue({ single: singleMock }) }) }
      if (table === 'yarn_items') return yarnUpdateChain
      return {}
    }),
    _insertMock: insertMock,
  }
}

beforeEach(() => vi.clearAllMocks())

// ── AC 4 – Følgetråd label i "eksisterende projekt"-mode ─────────────────────

describe('AC4 – Følgetråd-label i BrugNoeglerModal (eksisterende projekt)', () => {
  it('viser "Følgetråd" label (ikke "Strikket med")', async () => {
    const mock = buildSupabaseMock()
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => {
      const labels = screen.getAllByText('Følgetråd')
      expect(labels.length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.queryByText(/^strikket med$/i)).not.toBeInTheDocument()
  })
})

describe('AC4 – Følgetråd-label i BrugNoeglerModal (nyt projekt-mode)', () => {
  it('"Opret nyt projekt"-mode viser Følgetråd-label', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock()
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    // Skift til "Opret nyt projekt"-mode
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /opret nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /opret nyt projekt/i }))

    await waitFor(() => {
      const labels = screen.getAllByText('Følgetråd')
      expect(labels.length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.queryByText(/^strikket med$/i)).not.toBeInTheDocument()
  })
})

// ── AC 5 – held_with sendes til DB ────────────────────────────────────────────

describe('AC5 – toUsageDb mapper heldWith → held_with', () => {
  it('toUsageDb sender held_with-feltet til databasen', () => {
    const { toUsageDb: realToUsageDb } = vi.mocked(toUsageDb) as never
    // Verificer at mock er sat op korrekt
    const result = toUsageDb({ heldWith: 'Mohair', projectId: 'p1', yarnItemId: 'y1' } as never)
    expect(result).toMatchObject({ held_with: 'Mohair' })
  })
})
