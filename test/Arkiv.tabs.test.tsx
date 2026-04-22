/**
 * Arkiv – tab/counts/search tests
 *
 * AC 1  Three tabs with labels and counts; default tab is "Færdigstrikket".
 * AC 2  Search filters within the active tab only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
}))

vi.mock('@/lib/catalog', () => ({
  displayYarnName: vi.fn((y: { name: string }) => y.name),
  fetchColorsByIds: vi.fn(() => Promise.resolve(new Map())),
  fetchColorsForYarn: vi.fn(() => Promise.resolve([])),
  searchYarnsFull: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/lib/supabase/mappers', () => ({
  fromUsageDb: vi.fn((row: Record<string, unknown>) => row),
  toUsageDb: vi.fn((v: unknown) => v),
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(() => Promise.resolve('https://example.com/file')),
}))

vi.mock('@/lib/export/exportProjekter', () => ({
  exportProjekter: vi.fn(() => Promise.resolve({ success: true })),
}))

vi.mock('@/components/app/DelMedFaellesskabetModal', () => ({
  DelMedFaellesskabetModal: () => null,
}))

import { useSupabase } from '@/lib/supabase/client'
import Arkiv from '@/components/app/Arkiv'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = { id: 'user-1' }

/** Builds a Supabase mock that returns the given projects. */
function buildSupabaseMock(projects: object[]) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'projects') {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: undefined,
        // Mimic promise chain: select().order().order() resolves to { data, error }
        // We simulate chainable thenable by overriding at the end via custom mock.
        // Instead, use a simpler factory approach:
      }
    }
    if (table === 'yarn_usage') {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }
  })

  // Build a proper chainable mock for projects query
  const projectsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => projectsChain),
  }
  projectsChain.eq.mockImplementation(() => projectsChain)
  // The last .order() call must return a resolved promise
  let orderCallCount = 0
  projectsChain.order.mockImplementation(() => {
    orderCallCount++
    if (orderCallCount >= 2) {
      return Promise.resolve({ data: projects, error: null })
    }
    return projectsChain
  })

  const yarnChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return projectsChain
      if (table === 'yarn_usage') return yarnChain
      return { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }
    }),
  }
}

const sampleProjects = [
  { id: 'p1', title: 'Sommersweater', status: 'faerdigstrikket', is_shared: false, used_at: '2024-01-01', created_at: '2024-01-01', needle_size: null, held_with: null, notes: null, project_image_url: null, pattern_pdf_url: null, user_id: 'user-1' },
  { id: 'p2', title: 'Vinterhue', status: 'i_gang', is_shared: false, used_at: '2024-02-01', created_at: '2024-02-01', needle_size: null, held_with: null, notes: null, project_image_url: null, pattern_pdf_url: null, user_id: 'user-1' },
  { id: 'p3', title: 'Drømmesokker', status: 'vil_gerne', is_shared: false, used_at: null, created_at: '2024-03-01', needle_size: null, held_with: null, notes: null, project_image_url: null, pattern_pdf_url: null, user_id: 'user-1' },
  { id: 'p4', title: 'Ekstra færdig', status: 'faerdigstrikket', is_shared: false, used_at: '2024-01-15', created_at: '2024-01-15', needle_size: null, held_with: null, notes: null, project_image_url: null, pattern_pdf_url: null, user_id: 'user-1' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// AC 1 – Three tabs with correct labels; default is "Færdigstrikket"
// ---------------------------------------------------------------------------

describe('AC1 – Tabs with labels and counts; default is Færdigstrikket', () => {
  it('renders all three tab labels', async () => {
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock(sampleProjects) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /vil gerne strikke/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /i gang/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /færdigstrikket/i })).toBeInTheDocument()
    })
  })

  it('default active tab is Færdigstrikket (aria-selected=true)', async () => {
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock(sampleProjects) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /færdigstrikket/i })
      expect(tab).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('shows project count in the Færdigstrikket tab label', async () => {
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock(sampleProjects) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    // 2 faerdigstrikket projects → "(2)"
    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /færdigstrikket/i })
      expect(tab.textContent).toMatch(/2/)
    })
  })

  it('shows correct count in I gang tab', async () => {
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock(sampleProjects) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /i gang/i })
      expect(tab.textContent).toMatch(/1/)
    })
  })

  it('shows correct count in Vil gerne strikke tab', async () => {
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock(sampleProjects) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /vil gerne strikke/i })
      expect(tab.textContent).toMatch(/1/)
    })
  })
})

// ---------------------------------------------------------------------------
// AC 2 – Search filters within the active tab only
// ---------------------------------------------------------------------------

describe('AC2 – Search filters within active tab only', () => {
  it('on default tab (Færdigstrikket), search finds only matching projects in that tab', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock(sampleProjects) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    // Wait for data to load – both faerdigstrikket projects visible
    await waitFor(() => {
      expect(screen.getByText('Sommersweater')).toBeInTheDocument()
      expect(screen.getByText('Ekstra færdig')).toBeInTheDocument()
    })

    // Search for "Sommer"
    const searchInput = screen.getByPlaceholderText(/søg projekt/i)
    await user.type(searchInput, 'Sommer')

    await waitFor(() => {
      expect(screen.getByText('Sommersweater')).toBeInTheDocument()
      expect(screen.queryByText('Ekstra færdig')).not.toBeInTheDocument()
    })

    // "Vinterhue" belongs to i_gang – should NOT appear even though no explicit filter
    expect(screen.queryByText('Vinterhue')).not.toBeInTheDocument()
  })

  it('switching tab clears cross-tab bleed from search', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock(sampleProjects) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Sommersweater')).toBeInTheDocument()
    })

    // Switch to I gang tab
    await user.click(screen.getByRole('tab', { name: /i gang/i }))

    await waitFor(() => {
      expect(screen.getByText('Vinterhue')).toBeInTheDocument()
      // Færdigstrikket projects should not bleed through
      expect(screen.queryByText('Sommersweater')).not.toBeInTheDocument()
    })
  })
})
