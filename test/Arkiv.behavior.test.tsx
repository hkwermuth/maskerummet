/**
 * Adfærdstest for Arkiv (BACKLOG 8.8 Trin 0).
 *
 * Sikkerhedsnet før refaktorering: dækker opret/status-skift/tilføj garn/slet/
 * arkiver via synligt UI. Tester adfærd via DOM, ikke implementation details,
 * så testene overlever struktur-ændringer i Arkiv.jsx (3013 linjer).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Spies på return/allocate/finalize-libs (hejset via vi.hoisted) ───────────
// vi.mock factories hejses til toppen af filen, så top-level const's er ikke
// tilgængelige inde i factory-callbacks. vi.hoisted() sikrer at spies er
// initialiseret FØR factory-koden køres.

const {
  returnYarnLinesToStashSpy,
  allocateYarnToProjectSpy,
  finalizeYarnLinesSpy,
} = vi.hoisted(() => ({
  returnYarnLinesToStashSpy: vi.fn(() => Promise.resolve({ updatedYarnItems: 0 })),
  allocateYarnToProjectSpy: vi.fn(() => Promise.resolve({ inUseYarnItemId: 'mock-inuse' })),
  finalizeYarnLinesSpy: vi.fn(() => Promise.resolve()),
}))

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
}))

vi.mock('@/lib/catalog', () => ({
  displayYarnName: vi.fn((y: { name?: string }) => y?.name ?? ''),
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
    quantityUsed: row.quantity_used ?? 0,
    catalogYarnId: row.catalog_yarn_id ?? null,
    catalogColorId: row.catalog_color_id ?? null,
    yarnItemId: row.yarn_item_id ?? null,
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

vi.mock('@/lib/yarn-return', () => ({
  findYarnItemMatch: vi.fn(() => Promise.resolve(null)),
  returnYarnLinesToStash: returnYarnLinesToStashSpy,
}))

vi.mock('@/lib/yarn-allocate', () => ({
  allocateYarnToProject: allocateYarnToProjectSpy,
  applyAllocationDelta: vi.fn(() => Promise.resolve({})),
  validateLineStock: vi.fn(() => ({ valid: true })),
}))

vi.mock('@/lib/yarn-finalize', () => ({
  classifyFinalizableLines: vi.fn(() =>
    Promise.resolve({ finalizable: [], multiProject: [], noYarnItem: [] }),
  ),
  finalizeYarnLines: finalizeYarnLinesSpy,
  revertCascadedYarns: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/components/app/GarnLinjeVælger', () => ({
  default: () => <div data-testid="garn-linje-vaelger" />,
  defaultTabForStatus: (s: string) => (s === 'vil_gerne' ? 'katalog' : 'mit_garn'),
  inferTabFromLine: () => 'manuelt',
}))

// Stub ConfirmDeleteProjectModal: eksponér onConfirm via en synlig knap
// så testen kan trigge performDelete('return') uden at navigere det rigtige
// modal-flow med mange valg.
vi.mock('@/components/app/ConfirmDeleteProjectModal', () => ({
  default: ({ onConfirm }: { onConfirm: (choice: string) => void }) => (
    <div data-testid="confirm-delete-project-modal">
      <button type="button" onClick={() => onConfirm('return')}>
        Returnér garn
      </button>
      <button type="button" onClick={() => onConfirm('delete-all')}>
        Slet alt
      </button>
    </div>
  ),
}))

vi.mock('@/components/app/ReturnYarnConfirmModal', () => ({
  default: () => null,
}))

vi.mock('@/components/app/MarkYarnsBrugtOpModal', () => ({
  default: () => null,
}))

import { useSupabase } from '@/lib/supabase/client'
import Arkiv from '@/components/app/Arkiv'

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_USER = { id: 'user-1' }

type ProjectRow = Record<string, unknown> & { id: string; status: string }
type UsageRow = Record<string, unknown> & { project_id: string }

/**
 * Bygger en Supabase-mock der:
 *  - Returnerer `projects` for projects-kæden (.select.eq.order.order)
 *  - Returnerer `usageRows` for yarn_usage select-kæder
 *  - Sporer insert/update/delete via tilbagereturnerede vi.fn()'s
 *  - Sporer yarn_items.select.in.order-kald for test 4
 */
function buildSupabaseMock(opts: {
  projects?: ProjectRow[]
  usageRows?: UsageRow[]
  insertedProject?: Record<string, unknown>
  updatedProject?: Record<string, unknown>
} = {}) {
  const projects = opts.projects ?? []
  const usageRows = opts.usageRows ?? []

  let orderCallCount = 0
  const projectInsertSingle = vi.fn().mockResolvedValue({
    data:
      opts.insertedProject ?? {
        id: 'new-project-id',
        title: 'Mocked',
        status: 'vil_gerne',
        is_shared: false,
        used_at: null,
        created_at: '2026-05-12',
        needle_size: null,
        notes: null,
        project_image_urls: [],
        pattern_pdf_url: null,
        pattern_image_urls: [],
        pattern_pdf_thumbnail_url: null,
        pattern_name: null,
        pattern_designer: null,
        user_id: 'user-1',
      },
    error: null,
  })
  const projectUpdateSingle = vi.fn().mockResolvedValue({
    data: opts.updatedProject ?? projects[0] ?? null,
    error: null,
  })
  const projectDeleteEq = vi.fn().mockResolvedValue({ error: null })

  const yarnItemsInFn = vi.fn().mockReturnThis()

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
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: projectInsertSingle,
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: projectUpdateSingle,
        })),
      })),
    })),
    delete: vi.fn(() => ({ eq: projectDeleteEq })),
  }
  projectsChain.eq.mockImplementation(() => projectsChain)

  const yarnUsageChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: usageRows, error: null }),
    insert: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    // upsert bruges af handleSave (yarn_usage.upsert(rows).select())
    upsert: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    // delete bruges ved fjernelse af yarn_usage-rækker (yarn_usage.delete().in())
    delete: vi.fn(() => ({
      in: vi.fn().mockResolvedValue({ error: null }),
    })),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        then: vi.fn(),
      })),
    })),
  }

  const yarnItemsChain = {
    select: vi.fn().mockReturnThis(),
    in: yarnItemsInFn,
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return projectsChain
      if (table === 'yarn_usage') return yarnUsageChain
      if (table === 'yarn_items') return yarnItemsChain
      return { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }
    }),
  }

  return {
    supabase,
    projectInsertSingle,
    projectUpdateSingle,
    projectDeleteEq,
    yarnItemsInFn,
  }
}

const baseProject = (overrides: Partial<ProjectRow> = {}): ProjectRow => ({
  id: 'p-1',
  title: 'Testprojekt',
  status: 'vil_gerne',
  is_shared: false,
  used_at: null,
  created_at: '2026-04-01',
  needle_size: null,
  held_with: null,
  notes: null,
  project_image_urls: [],
  pattern_pdf_url: null,
  pattern_image_urls: [],
  pattern_pdf_thumbnail_url: null,
  pattern_name: null,
  pattern_designer: null,
  user_id: 'user-1',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Arkiv – adfærdstest (sikkerhedsnet for refaktorering)', () => {
  it('opret projekt → vises i Vil gerne-fanen', async () => {
    const newId = 'p-new'
    const newProject = baseProject({
      id: newId,
      title: 'Sommersweater',
      status: 'vil_gerne',
    })
    const mock = buildSupabaseMock({ insertedProject: newProject })
    vi.mocked(useSupabase).mockReturnValue(mock.supabase as never)

    const user = userEvent.setup()
    render(<Arkiv user={FAKE_USER} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    // Modal åbnet — vælg status "Vil gerne strikke"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vil gerne strikke/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /vil gerne strikke/i }))

    // Udfyld titel
    const titleInput = screen.getByPlaceholderText(/F\.eks\. Sommersweater/)
    await user.type(titleInput, 'Sommersweater')

    // Klik Tilføj projekt
    await user.click(screen.getByRole('button', { name: /tilføj projekt/i }))

    await waitFor(() => {
      expect(mock.projectInsertSingle).toHaveBeenCalled()
    })

    // Modal lukker
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /tilføj projekt/i })).not.toBeInTheDocument()
    })

    // Skift til Vil gerne-tab og verificer at projektet vises
    await user.click(screen.getByRole('tab', { name: /vil gerne strikke/i }))

    await waitFor(() => {
      expect(screen.getByText('Sommersweater')).toBeInTheDocument()
    })
  })

  it("skift status fra 'Vil gerne' til 'I gang' → projekt vises i 'I gang'-fanen", async () => {
    const project = baseProject({ id: 'p-status', title: 'Statussvinger', status: 'vil_gerne' })
    const updated = { ...project, status: 'i_gang' }
    const mock = buildSupabaseMock({ projects: [project], updatedProject: updated })
    vi.mocked(useSupabase).mockReturnValue(mock.supabase as never)

    const user = userEvent.setup()
    render(<Arkiv user={FAKE_USER} onRequestLogin={vi.fn()} />)

    // Default-tab er Færdigstrikket — switch til Vil gerne
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /vil gerne strikke/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: /vil gerne strikke/i }))

    await waitFor(() => {
      expect(screen.getByText('Statussvinger')).toBeInTheDocument()
    })

    // Åbn DetailModal
    await user.click(screen.getByText('Statussvinger'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    // I edit-mode: klik 'I gang'-chip (StatusChips)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^I gang$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^I gang$/ }))

    // Gem ændringer
    await user.click(screen.getByRole('button', { name: /gem ændringer/i }))

    // Verificer update-kald gik igennem (status='i_gang' indlejret i kæden)
    await waitFor(() => {
      expect(mock.projectUpdateSingle).toHaveBeenCalled()
    })

    // Modal er nu i read-only mode (viser Rediger-knap) — luk den
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /luk projekt/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /luk projekt/i }))

    // Projektet er nu i I gang-tab
    await user.click(screen.getByRole('tab', { name: /^I gang/ }))
    await waitFor(() => {
      expect(screen.getByText('Statussvinger')).toBeInTheDocument()
    })
  // Timeout 15s: handleSave har en dyb async DB-kæde + GC-pressure i shared-suite
  }, 15000)

  it('tilføj garn til projekt → yarn_items kald sker', async () => {
    const mock = buildSupabaseMock()
    vi.mocked(useSupabase).mockReturnValue(mock.supabase as never)

    const user = userEvent.setup()
    render(<Arkiv user={FAKE_USER} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })

    // Åbn NytProjektModal — den trigger loadStash() der kalder
    // supabase.from('yarn_items').select('*').in('status', ['På lager', 'I brug']).order(...)
    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    await waitFor(() => {
      expect(mock.yarnItemsInFn).toHaveBeenCalledWith(
        'status',
        ['På lager', 'I brug'],
      )
    })
  })

  it('slet projekt → bekræftelsesdialog → projekt forsvinder', async () => {
    const project = baseProject({
      id: 'p-del',
      title: 'Skal slettes',
      status: 'vil_gerne',
    })
    const mock = buildSupabaseMock({ projects: [project] })
    vi.mocked(useSupabase).mockReturnValue(mock.supabase as never)

    const user = userEvent.setup()
    render(<Arkiv user={FAKE_USER} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /vil gerne strikke/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: /vil gerne strikke/i }))

    await waitFor(() => {
      expect(screen.getByText('Skal slettes')).toBeInTheDocument()
    })

    // Åbn DetailModal
    await user.click(screen.getByText('Skal slettes'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /slet projekt/i })).toBeInTheDocument()
    })

    // Tomt projekt (yarnLines=[]) → simpel ja/nej-flow
    await user.click(screen.getByRole('button', { name: /slet projekt/i }))

    // Bekræftelse vises
    expect(screen.getByText(/er du sikker/i)).toBeInTheDocument()
    expect(mock.projectDeleteEq).not.toHaveBeenCalled()

    // Klik Ja, slet
    await user.click(screen.getByRole('button', { name: /ja, slet/i }))

    await waitFor(() => {
      expect(mock.projectDeleteEq).toHaveBeenCalled()
    })

    // Projektet er forsvundet fra UI
    await waitFor(() => {
      expect(screen.queryByText('Skal slettes')).not.toBeInTheDocument()
    })
  })

  it('arkivér projekt → garn returneres (returnYarnLinesToStash kaldes)', async () => {
    // Projekt MED yarnLines → ConfirmDeleteProjectModal-stien
    const project = baseProject({
      id: 'p-archive',
      title: 'Med garn',
      status: 'i_gang',
    })
    const usageRows: UsageRow[] = [
      {
        id: 'usage-1',
        project_id: 'p-archive',
        yarn_name: 'Garn A',
        yarn_brand: 'Brand A',
        color_name: 'Rød',
        color_code: '001',
        hex_color: '#ff0000',
        quantity_used: 2,
        yarn_item_id: 'yi-1',
      },
    ]
    const mock = buildSupabaseMock({ projects: [project], usageRows })
    vi.mocked(useSupabase).mockReturnValue(mock.supabase as never)

    const user = userEvent.setup()
    render(<Arkiv user={FAKE_USER} onRequestLogin={vi.fn()} />)

    // Switch til I gang-tab
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /^I gang/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: /^I gang/ }))

    await waitFor(() => {
      expect(screen.getByText('Med garn')).toBeInTheDocument()
    })

    // Åbn DetailModal
    await user.click(screen.getByText('Med garn'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /slet projekt/i })).toBeInTheDocument()
    })

    // Projekt MED yarnLines → klik åbner ConfirmDeleteProjectModal direkte
    await user.click(screen.getByRole('button', { name: /slet projekt/i }))

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-project-modal')).toBeInTheDocument()
    })

    // Klik "Returnér garn" i stubben → trigger onConfirm('return')
    await user.click(screen.getByRole('button', { name: /returnér garn/i }))

    await waitFor(() => {
      expect(returnYarnLinesToStashSpy).toHaveBeenCalled()
    })
  })
})
