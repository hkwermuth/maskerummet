/**
 * F11 – Arkiv projekt-form-forbedringer (supplerende tests)
 *
 * AC 1  Garnsøgning filter: yarn_items hentes med .in('status', ['På lager', 'I brug'])
 *       i både NytProjektModal og DetailModal edit-mode.
 * AC 2  Dynamisk titel-label baseret på status (NytProjektModal):
 *         - vil_gerne  → "Hvad vil du strikke?"
 *         - i_gang     → "Hvad strikker du?"
 *         - faerdigstrikket → "Hvad strikkede du?"
 *       Label opdateres reaktivt via StatusChips.
 * AC 3  Placeholders:
 *         - Opskriftsnavn-input placeholder: "Fx. Sophie Scarf"
 *         - Designer-input placeholder: "Fx. PetiteKnit"
 *       I NytProjektModal og DetailModal edit-mode.
 * AC 4  StatusAccentBar: role="status" + aria-label "Projektstatus: <label>"
 *       vises i begge modaler. Tekst matcher PROJECT_STATUS_LABELS.
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

// Mock GarnLinjeVælger enkelt
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

/**
 * Bygger en supabase-mock der TRACKER kald til yarn_items-kæden,
 * herunder om .in() kaldes med de korrekte statuser.
 */
function buildSupabaseMockWithTracking(projects: object[], usageRows: object[] = []) {
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

  // yarn_items-kæden med tracking af .in()-kaldet
  const yarnItemsInFn = vi.fn().mockReturnThis()
  const yarnItemsOrderFn = vi.fn().mockResolvedValue({ data: [], error: null })
  const yarnItemsChain = {
    select: vi.fn().mockReturnThis(),
    in: yarnItemsInFn,
    order: yarnItemsOrderFn,
  }

  const mock = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return projectsChain
      if (table === 'yarn_usage') return yarnChain
      if (table === 'yarn_items') return yarnItemsChain
      return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    }),
    _yarnItemsInFn: yarnItemsInFn,
    _yarnItemsChain: yarnItemsChain,
  }
  return mock
}

const projectBase = {
  id: 'p-test',
  title: 'Test projekt',
  status: 'faerdigstrikket',
  is_shared: false,
  used_at: '2024-01-01',
  created_at: '2024-01-01',
  needle_size: '4',
  held_with: null,
  notes: null,
  project_image_urls: [],
  pattern_pdf_url: null,
  pattern_image_urls: [],
  pattern_pdf_thumbnail_url: null,
  pattern_name: '',
  pattern_designer: '',
  user_id: 'user-1',
}

beforeEach(() => vi.clearAllMocks())

// ── AC 1 – Garnsøgning filter i NytProjektModal ───────────────────────────────

describe('AC1 – yarn_items hentes med .in(status, [På lager, I brug]) i NytProjektModal', () => {
  it('supabase yarn_items-kæden kaldes med korrekt status-filter', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMockWithTracking([])
    vi.mocked(useSupabase).mockReturnValue(mock as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    // Åbn NytProjektModal
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    // Vent på at modalen er åben
    await waitFor(() => {
      expect(screen.getByText('Opskriftsnavn')).toBeInTheDocument()
    })

    // Verificer at .in() blev kaldt med 'status' og de korrekte værdier
    await waitFor(() => {
      expect(mock._yarnItemsInFn).toHaveBeenCalledWith('status', ['På lager', 'I brug'])
    })
  })
})

// ── AC 1 – Garnsøgning filter i DetailModal edit-mode ────────────────────────

describe('AC1 – yarn_items hentes med .in(status, [På lager, I brug]) i DetailModal edit-mode', () => {
  it('supabase yarn_items-kæden kaldes med korrekt status-filter i DetailModal', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMockWithTracking([projectBase])
    vi.mocked(useSupabase).mockReturnValue(mock as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    // Åbn DetailModal
    await waitFor(() => {
      expect(screen.getByText('Test projekt')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Test projekt'))

    // Klik Rediger
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    // Vent på edit-mode
    await waitFor(() => {
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })

    // Verificer at .in() blev kaldt med de korrekte statuser
    await waitFor(() => {
      expect(mock._yarnItemsInFn).toHaveBeenCalledWith('status', ['På lager', 'I brug'])
    })
  })
})

// ── AC 2 – Dynamisk titel-label i NytProjektModal ────────────────────────────

describe('AC2 – Dynamisk titel-label baseret på status i NytProjektModal', () => {
  async function openNytProjektModal(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))
    // Vent til modalen er åben
    await waitFor(() => {
      expect(screen.getByText('Opskriftsnavn')).toBeInTheDocument()
    })
  }

  it('status=faerdigstrikket (default) → label viser "Hvad strikkede du?"', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    expect(screen.getByText('Hvad strikkede du?')).toBeInTheDocument()
  })

  it('status=vil_gerne → label viser "Hvad vil du strikke?"', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    // Skift status til "Vil gerne strikke"
    await user.click(screen.getByRole('button', { name: /vil gerne strikke/i }))
    await waitFor(() => {
      expect(screen.getByText('Hvad vil du strikke?')).toBeInTheDocument()
    })
  })

  it('status=i_gang → label viser "Hvad strikker du?"', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    // Skift status til "I gang"
    await user.click(screen.getByRole('button', { name: /^i gang$/i }))
    await waitFor(() => {
      expect(screen.getByText('Hvad strikker du?')).toBeInTheDocument()
    })
  })

  it('label opdateres reaktivt når status skiftes (faerdigstrikket → vil_gerne → i_gang)', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    // Start: faerdigstrikket
    expect(screen.getByText('Hvad strikkede du?')).toBeInTheDocument()

    // Skift til vil_gerne
    await user.click(screen.getByRole('button', { name: /vil gerne strikke/i }))
    await waitFor(() => {
      expect(screen.getByText('Hvad vil du strikke?')).toBeInTheDocument()
    })
    expect(screen.queryByText('Hvad strikkede du?')).not.toBeInTheDocument()

    // Skift til i_gang
    await user.click(screen.getByRole('button', { name: /^i gang$/i }))
    await waitFor(() => {
      expect(screen.getByText('Hvad strikker du?')).toBeInTheDocument()
    })
    expect(screen.queryByText('Hvad vil du strikke?')).not.toBeInTheDocument()
  })
})

// ── AC 3 – Placeholders i NytProjektModal ─────────────────────────────────────

describe('AC3 – Placeholders i NytProjektModal', () => {
  async function openNytProjektModal(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))
    await waitFor(() => {
      expect(screen.getByText('Opskriftsnavn')).toBeInTheDocument()
    })
  }

  it('Opskriftsnavn-input har placeholder "Fx. Sophie Scarf"', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    expect(screen.getByPlaceholderText('Fx. Sophie Scarf')).toBeInTheDocument()
  })

  it('Designer-input har placeholder "Fx. PetiteKnit"', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    expect(screen.getByPlaceholderText('Fx. PetiteKnit')).toBeInTheDocument()
  })
})

// ── AC 3 – Placeholders i DetailModal edit-mode ───────────────────────────────

describe('AC3 – Placeholders i DetailModal edit-mode', () => {
  async function openEditMode(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => {
      expect(screen.getByText('Test projekt')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Test projekt'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))
    await waitFor(() => {
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })
  }

  it('Opskriftsnavn-input i DetailModal edit-mode har placeholder "Fx. Sophie Scarf"', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([projectBase]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openEditMode(user)

    expect(screen.getByPlaceholderText('Fx. Sophie Scarf')).toBeInTheDocument()
  })

  it('Designer-input i DetailModal edit-mode har placeholder "Fx. PetiteKnit"', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([projectBase]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openEditMode(user)

    expect(screen.getByPlaceholderText('Fx. PetiteKnit')).toBeInTheDocument()
  })
})

// ── AC 4 – StatusAccentBar i NytProjektModal ──────────────────────────────────

describe('AC4 – StatusAccentBar vises i NytProjektModal', () => {
  async function openNytProjektModal(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))
    await waitFor(() => {
      expect(screen.getByText('Opskriftsnavn')).toBeInTheDocument()
    })
  }

  it('et element med role="status" og aria-label der starter med "Projektstatus:" vises', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    const bar = screen.getByRole('status')
    expect(bar).toBeInTheDocument()
    expect(bar.getAttribute('aria-label')).toMatch(/^Projektstatus:/i)
  })

  it('StatusAccentBar-tekst matcher PROJECT_STATUS_LABELS for faerdigstrikket (default)', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    const bar = screen.getByRole('status')
    expect(bar.textContent).toContain('Færdigstrikket')
  })

  it('StatusAccentBar opdateres til "I gang" ved status-skift', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    // Skift til I gang
    await user.click(screen.getByRole('button', { name: /^i gang$/i }))
    await waitFor(() => {
      const bar = screen.getByRole('status')
      expect(bar.getAttribute('aria-label')).toBe('Projektstatus: I gang')
    })
  })

  it('StatusAccentBar opdateres til "Vil gerne strikke" ved status-skift', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openNytProjektModal(user)

    await user.click(screen.getByRole('button', { name: /vil gerne strikke/i }))
    await waitFor(() => {
      const bar = screen.getByRole('status')
      expect(bar.getAttribute('aria-label')).toBe('Projektstatus: Vil gerne strikke')
    })
  })
})

// ── AC 4 – StatusAccentBar i DetailModal edit-mode ────────────────────────────

describe('AC4 – StatusAccentBar vises i DetailModal edit-mode', () => {
  it('StatusAccentBar med role="status" vises i edit-mode', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMockWithTracking([projectBase]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Test projekt')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Test projekt'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    await waitFor(() => {
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })

    const bar = screen.getByRole('status')
    expect(bar).toBeInTheDocument()
    expect(bar.getAttribute('aria-label')).toMatch(/^Projektstatus:/i)
    expect(bar.textContent).toContain('Færdigstrikket')
  })
})
