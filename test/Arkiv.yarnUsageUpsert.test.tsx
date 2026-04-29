/**
 * Tests for yarn_usage upsert-fix.
 *
 * Bug: ved redigering af projekt med blandet eksisterende+nye garn-linjer
 * sendte PostgREST `id: null` for nye rækker (NOT NULL-constraint-fejl) fordi
 * unionen af keys på tværs af payload-array'et bestemmer kolonne-listen.
 *
 * Fix: Arkiv.jsx:816 sender nu `{ defaultToNull: false }` til upsert, så
 * missing keys bruger DB-DEFAULT (`gen_random_uuid()`) i stedet for NULL.
 *
 * Test-strategi: full UI-flow gennem DetailModal → Rediger → Gem ændringer,
 * og verificér at supabase.from('yarn_usage').upsert() kaldes med
 * `{ defaultToNull: false }` som 2. argument.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
    id: row.id ?? 'usage-new',
    yarnName: row.yarn_name ?? '',
    yarnBrand: row.yarn_brand ?? '',
    colorName: row.color_name ?? '',
    colorCode: row.color_code ?? '',
    hex: row.hex_color ?? '#A8C4C4',
    quantityUsed: row.quantity_used ?? '',
    catalogYarnId: row.catalog_yarn_id ?? null,
    catalogColorId: row.catalog_color_id ?? null,
  })),
  toUsageDb: vi.fn((v: Record<string, unknown>) => ({
    project_id: v.projectId ?? null,
    yarn_name: v.yarnName ?? null,
    yarn_brand: v.yarnBrand ?? null,
    color_name: v.colorName ?? null,
    color_code: v.colorCode ?? null,
    hex_color: v.hex ?? null,
    catalog_yarn_id: v.catalogYarnId ?? null,
    catalog_color_id: v.catalogColorId ?? null,
    quantity_used: v.quantityUsed ? parseFloat(String(v.quantityUsed)) : null,
    used_for: v.usedFor ?? null,
    needle_size: v.needleSize ?? null,
    held_with: null,
    notes: v.notes ?? null,
    project_image_url: null,
    pattern_pdf_url: null,
    used_at: v.usedAt ?? new Date().toISOString().slice(0, 10),
  })),
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

const mockUser = { id: 'user-1' }

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

// project_id ER NØDVENDIGT — ellers springer Arkiv-loaderen rækken over
// (`if (!pid) continue` ved bygning af yarnByProjectId), og entry.yarnLines
// ender tom, hvilket får handleSave til at throw'e før upsert kaldes.
const existingUsage = {
  id: 'usage-existing-1',
  project_id: 'p-test',
  yarn_name: 'Hannah',
  yarn_brand: 'Permin',
  color_name: 'Blå',
  color_code: '88301',
  hex_color: '#4A90D9',
  quantity_used: 2,
  catalog_yarn_id: null,
  catalog_color_id: null,
}

interface UpsertTracker {
  rows: unknown[] | null
  options: unknown | null
}

function buildMock(projects: object[], usageRows: object[]) {
  const upsertTracker: UpsertTracker = { rows: null, options: null }

  let projectsOrderCount = 0
  // ENG: projects-kæden skal håndtere både select-list-flow og update-single-flow
  const projectsChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => {
      projectsOrderCount++
      // Initial liste-load: returnér projekter på 2. order-kald (created_at)
      if (projectsOrderCount >= 2) {
        return Promise.resolve({ data: projects, error: null })
      }
      return projectsChain
    }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: projects[0] ?? null, error: null }),
  }

  const upsertSelectFn = vi.fn().mockResolvedValue({
    data: [{ ...existingUsage }],
    error: null,
  })
  const upsertFn = vi.fn().mockImplementation((rows: unknown[], options: unknown) => {
    upsertTracker.rows = rows as unknown[]
    upsertTracker.options = options
    return { select: upsertSelectFn }
  })

  const yarnUsageDeleteFn = vi.fn().mockImplementation(() => ({
    in: vi.fn().mockResolvedValue({ data: null, error: null }),
  }))

  // yarn_usage-kæden: select/in/order til load, upsert+delete til save
  const yarnUsageChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: usageRows, error: null }),
    upsert: upsertFn,
    delete: yarnUsageDeleteFn,
  }

  const yarnItemsChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return projectsChain
      if (table === 'yarn_usage') return yarnUsageChain
      if (table === 'yarn_items') return yarnItemsChain
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }),
    _upsertTracker: upsertTracker,
    _upsertFn: upsertFn,
  }
}

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

beforeEach(() => vi.clearAllMocks())

describe('yarn_usage upsert-fix', () => {
  it('upsert kaldes med { defaultToNull: false } når et eksisterende projekt gemmes', async () => {
    const user = userEvent.setup()
    const mock = buildMock([projectBase], [existingUsage])
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openEditMode(user)

    // Klik Gem ændringer (form har én eksisterende garn-linje fra entry.yarnLines)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /gem ændringer/i }))
    })

    await waitFor(() => {
      expect(mock._upsertFn).toHaveBeenCalled()
    })

    // KERNE: 2. argument til upsert SKAL være { defaultToNull: false }
    expect(mock._upsertTracker.options).toEqual({ defaultToNull: false })
  })

  it('eksisterende garn-linjer beholder deres id i upsert-payload', async () => {
    const user = userEvent.setup()
    const mock = buildMock([projectBase], [existingUsage])
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)
    await openEditMode(user)

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /gem ændringer/i }))
    })

    await waitFor(() => {
      expect(mock._upsertFn).toHaveBeenCalled()
    })

    const rows = mock._upsertTracker.rows as Array<Record<string, unknown>>
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'usage-existing-1' })
  })
})
