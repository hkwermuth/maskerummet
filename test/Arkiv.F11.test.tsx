/**
 * F11 – Arkiv: pattern-felter, GarnLinjeVælger-integration
 *
 * AC 1   NytProjektModal viser "Opskriftsnavn" og "Designer"
 * AC 2   DetailModal/edit-mode viser samme to felter
 * AC 3   Read-only visning i DetailModal viser opskriftsnavn + designer hvis udfyldt
 * AC 4   "Følgetråd"-feltet er FJERNET fra UI (post-F11/2026-04-28)
 * AC 6   GarnLinjeVælger renderes i NytProjektModal ("Garn i projektet")
 * AC 13  Brugeren kan tilføje ≥2 garn-linjer (+ Tilføj garn-knap)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
}))

vi.mock('@/lib/catalog', () => ({
  displayYarnName: vi.fn((y: { name: string }) => y?.name ?? ''),
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
    hex: row.hex_color ?? '#A8C4C4',
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
  validateUploadFile: vi.fn(),
}))

vi.mock('@/lib/export/exportProjekter', () => ({
  exportProjekter: vi.fn(() => Promise.resolve({ success: true })),
}))

vi.mock('@/components/app/DelMedFaellesskabetModal', () => ({
  DelMedFaellesskabetModal: () => null,
}))

vi.mock('@/lib/pdf-thumbnail', () => ({
  renderPdfFirstPage: vi.fn(() => Promise.resolve(null)),
}))

// Mock GarnLinjeVælger enkelt så vi undgår dybe dependencies
vi.mock('@/components/app/GarnLinjeVælger', () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="garn-linje-vælger" data-status={status}>
      <div role="tablist" aria-label="Vælg garn-kilde">
        <button role="tab" aria-selected={status !== 'vil_gerne'}>Fra mit garn</button>
        <button role="tab" aria-selected={status === 'vil_gerne'}>Fra kataloget</button>
        <button role="tab">Manuelt</button>
      </div>
    </div>
  ),
  defaultTabForStatus: (s: string) => s === 'vil_gerne' ? 'katalog' : 'mit_garn',
  inferTabFromLine: () => 'manuelt',
}))

import { useSupabase } from '@/lib/supabase/client'
import Arkiv from '@/components/app/Arkiv'

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUser = { id: 'user-1' }

function buildSupabaseMock(projects: object[], usageRows: object[] = []) {
  let orderCallCount = 0
  const projectsChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    order: vi.fn().mockImplementation(() => {
      orderCallCount++
      if (orderCallCount >= 2) {
        return Promise.resolve({ data: projects, error: null })
      }
      return projectsChain
    }),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: projects[0] ?? null, error: null }),
  }
  projectsChain.eq.mockImplementation(() => projectsChain)

  const yarnChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: usageRows, error: null }),
  }

  const yarnItemsChain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return projectsChain
      if (table === 'yarn_usage') return yarnChain
      if (table === 'yarn_items') return yarnItemsChain
      return { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }
    }),
  }
}

const projectWithPattern = {
  id: 'p-pattern',
  title: 'Trøje med opskrift',
  status: 'faerdigstrikket',
  is_shared: false,
  used_at: '2024-01-01',
  created_at: '2024-01-01',
  needle_size: '4',
  held_with: 'Mohair',
  notes: null,
  project_image_urls: [],
  pattern_pdf_url: null,
  pattern_image_urls: [],
  pattern_pdf_thumbnail_url: null,
  pattern_name: 'Sierraknit Diamond Top',
  pattern_designer: 'Sanne Fjalland',
  user_id: 'user-1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── AC 1 – NytProjektModal: Opskriftsnavn + Designer ─────────────────────────

describe('AC1 – NytProjektModal viser Opskriftsnavn og Designer', () => {
  it('viser "Opskriftsnavn"-felt i NytProjektModal', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    await waitFor(() => {
      expect(screen.getByText('Opskriftsnavn')).toBeInTheDocument()
    })
  })

  it('viser "Designer"-felt i NytProjektModal', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    await waitFor(() => {
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })
  })

  it('viser IKKE "Følgetråd"-felt i NytProjektModal (fjernet post-F11)', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    // Vent på at modal er åben (Designer-feltet er stadig der)
    await waitFor(() => {
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })

    // "Følgetråd" og "Strikket med" må IKKE forekomme — feltet er fjernet
    expect(screen.queryByText(/^følgetråd$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/strikket med/i)).not.toBeInTheDocument()
  })
})

// ── AC 1 – GarnLinjeVælger renderes i NytProjektModal ────────────────────────

describe('AC6 – GarnLinjeVælger renderes i NytProjektModal', () => {
  it('viser GarnLinjeVælger under "Garn i projektet"', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    await waitFor(() => {
      expect(screen.getByTestId('garn-linje-vælger')).toBeInTheDocument()
    })
  })
})

// ── AC 13 – Tilføj ≥2 garn-linjer ────────────────────────────────────────────

describe('AC13 – Brugeren kan tilføje ≥2 garn-linjer', () => {
  it('viser "+ Tilføj garn"-knap i NytProjektModal', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ tilføj garn/i })).toBeInTheDocument()
    })
  })

  it('klik på "+ Tilføj garn" tilføjer en ekstra GarnLinjeVælger', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ tilføj garn/i })).toBeInTheDocument()
    })

    const before = screen.getAllByTestId('garn-linje-vælger').length
    await user.click(screen.getByRole('button', { name: /\+ tilføj garn/i }))

    const after = screen.getAllByTestId('garn-linje-vælger').length
    expect(after).toBe(before + 1)
    expect(after).toBeGreaterThanOrEqual(2)
  })
})

// ── AC 2 – DetailModal edit-mode: Opskriftsnavn + Designer ───────────────────

describe('AC2 – DetailModal/edit-mode viser Opskriftsnavn og Designer', () => {
  it('viser Opskriftsnavn og Designer i edit-mode', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWithPattern]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Trøje med opskrift')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Trøje med opskrift'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    await waitFor(() => {
      expect(screen.getByText('Opskriftsnavn')).toBeInTheDocument()
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })
  })

  it('viser IKKE Følgetråd-label i DetailModal edit-mode (fjernet post-F11)', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWithPattern]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Trøje med opskrift')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Trøje med opskrift'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    // Designer er stadig synlig i edit-mode (sanity-check), Følgetråd er ikke
    await waitFor(() => {
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })
    expect(screen.queryByText(/^følgetråd$/i)).not.toBeInTheDocument()
  })

  it('Opskriftsnavn-felt er præfyldt med gemte data', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWithPattern]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Trøje med opskrift')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Trøje med opskrift'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    await waitFor(() => {
      const input = screen.getByDisplayValue('Sierraknit Diamond Top')
      expect(input).toBeInTheDocument()
    })
  })

  it('Designer-felt er præfyldt med gemte data', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWithPattern]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Trøje med opskrift')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Trøje med opskrift'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    await waitFor(() => {
      const input = screen.getByDisplayValue('Sanne Fjalland')
      expect(input).toBeInTheDocument()
    })
  })
})

// ── AC 3 – Read-only visning: opskriftsnavn + designer ───────────────────────

describe('AC3 – Read-only DetailModal viser opskriftsnavn + designer', () => {
  it('viser Opskrift-label og pattern_name i read-only view', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWithPattern]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Trøje med opskrift')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Trøje med opskrift'))

    await waitFor(() => {
      expect(screen.getByText('Sierraknit Diamond Top')).toBeInTheDocument()
    })
  })

  it('viser Designer-label og pattern_designer i read-only view', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWithPattern]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Trøje med opskrift')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Trøje med opskrift'))

    await waitFor(() => {
      expect(screen.getByText('Sanne Fjalland')).toBeInTheDocument()
    })
  })

  it('viser IKKE Følgetråd-label i read-only view (fjernet post-F11)', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWithPattern]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Trøje med opskrift')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Trøje med opskrift'))

    // Designer-værdi vises (sanity-check at modal er åben), men Følgetråd-label gør ikke
    await waitFor(() => {
      expect(screen.getByText('Sanne Fjalland')).toBeInTheDocument()
    })
    expect(screen.queryByText(/^følgetråd$/i)).not.toBeInTheDocument()
  })
})
