/**
 * Tests for Arkiv del-knap — "Del med Fællesskabet" med stort F
 *
 * Dækker acceptkriterium 30.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
  fromDb: vi.fn((row: Record<string, unknown>) => row),
  fromUsageDb: vi.fn((row: Record<string, unknown>) => ({
    id: row.id ?? 'usage-1',
    yarnName: row.yarn_name ?? '',
    yarnBrand: row.yarn_brand ?? '',
    colorName: row.color_name ?? '',
    colorCode: row.color_code ?? '',
    hex: row.hex ?? '#A8C4C4',
    quantityUsed: row.quantity_used ?? '',
    catalogYarnId: row.catalog_yarn_id ?? null,
    catalogColorId: row.catalog_color_id ?? null,
  })),
  toUsageDb: vi.fn((v: unknown) => v),
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(() => Promise.resolve('https://example.com/file')),
  uploadFilesParallel: vi.fn(() => Promise.resolve([])),
  deleteFiles: vi.fn(() => Promise.resolve()),
  validateUploadFile: vi.fn(() => null),
}))

vi.mock('@/lib/pdf-thumbnail', () => ({
  renderPdfFirstPage: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/export/exportProjekter', () => ({
  exportProjekter: vi.fn(() => Promise.resolve({ success: true })),
}))

vi.mock('@/components/app/DelMedFaellesskabetModal', () => ({
  DelMedFaellesskabetModal: () => null,
}))

vi.mock('@/lib/date/formatDanish', () => ({
  formatDanish: vi.fn((s: string) => s),
}))

import { useSupabase } from '@/lib/supabase/client'
import Arkiv from '@/components/app/Arkiv'

const mockUser = { id: 'user-1' }

const finishedUnsharedProject = {
  id: 'p-finish',
  title: 'Min Færdige Trøje',
  status: 'faerdigstrikket',
  is_shared: false,
  used_at: '2024-01-01',
  created_at: '2024-01-01',
  needle_size: null,
  held_with: null,
  notes: null,
  project_image_urls: [],
  pattern_pdf_url: null,
  pattern_image_urls: [],
  pattern_pdf_thumbnail_url: null,
  user_id: 'user-1',
  community_size_shown: null,
}

const finishedSharedProject = {
  ...finishedUnsharedProject,
  id: 'p-shared',
  title: 'Min Delte Trøje',
  is_shared: true,
}

function buildSupabaseMock(projects: object[]) {
  let orderCallCount = 0
  const projectsChain: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
  } = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    order: vi.fn().mockImplementation(() => {
      orderCallCount++
      if (orderCallCount >= 2) {
        return Promise.resolve({ data: projects, error: null })
      }
      return projectsChain
    }),
  }
  projectsChain.eq.mockImplementation(() => projectsChain)

  const yarnChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return { ...projectsChain, ...updateChain }
      if (table === 'yarn_usage') return yarnChain
      return { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── AC30: Arkiv del-knap og aria-label med stort F ───────────────────────────

describe('AC30 Arkiv del-knap — "Fællesskabet" med stort F', () => {
  it('viser "Del med Fællesskabet" med stort F som knaptekst for udelt færdigt projekt', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(
      buildSupabaseMock([finishedUnsharedProject]) as never
    )
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Min Færdige Trøje')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Min Færdige Trøje'))

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /del med fællesskabet/i })
      // Præcis tekst med stort F
      expect(btn.textContent).toBe('Del med Fællesskabet')
    })
  })

  it('aria-label er "Del med Fællesskabet" (stort F) for udelt projekt', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(
      buildSupabaseMock([finishedUnsharedProject]) as never
    )
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Min Færdige Trøje')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Min Færdige Trøje'))

    await waitFor(() => {
      // Eksakt aria-label med stort F
      const btn = screen.getByRole('button', { name: 'Del med Fællesskabet' })
      expect(btn).toBeInTheDocument()
    })
  })

  it('viser "✓ Delt med Fællesskabet" tekst med stort F for delt projekt', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(
      buildSupabaseMock([finishedSharedProject]) as never
    )
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Min Delte Trøje')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Min Delte Trøje'))

    await waitFor(() => {
      // Knap-teksten (ikke aria-label) viser "✓ Delt med Fællesskabet"
      // aria-label er "Rediger deling med Fællesskabet"; textContent er "✓ Delt med Fællesskabet"
      const btn = screen.getByRole('button', { name: 'Rediger deling med Fællesskabet' })
      expect(btn.textContent).toContain('Delt med Fællesskabet')
      // Stort F
      expect(btn.textContent).not.toContain('fællesskabet')
    })
  })

  it('aria-label er "Rediger deling med Fællesskabet" (stort F) for delt projekt', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(
      buildSupabaseMock([finishedSharedProject]) as never
    )
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Min Delte Trøje')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Min Delte Trøje'))

    await waitFor(() => {
      // Eksakt aria-label med stort F
      const btn = screen.getByRole('button', { name: 'Rediger deling med Fællesskabet' })
      expect(btn).toBeInTheDocument()
    })
  })
})
