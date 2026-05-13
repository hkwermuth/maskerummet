/**
 * Adfærdstest for Garnlager (BACKLOG 8.8 Trin 0).
 *
 * Sikkerhedsnet før refaktorering: dækker tilføj/rediger/filtrer/slet via
 * synligt UI så testene overlever struktur-ændringer (state splittet ud i
 * hooks, sub-komponenter, etc.). Mocker useSupabase + side-effect-libs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockInsertReturn = vi.fn()
const mockUpdateReturn = vi.fn()
const mockDeleteEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/supabase/mappers', () => ({
  toDb: (x: unknown) => x,
  fromDb: (x: unknown) => x,
  toUsageDb: (x: unknown) => x,
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(),
}))

vi.mock('@/lib/catalog', () => ({
  searchYarnsFull: vi.fn().mockResolvedValue([]),
  fetchYarnFullById: vi.fn().mockResolvedValue(null),
  fetchColorsForYarn: vi.fn().mockResolvedValue([]),
  displayYarnName: vi.fn(() => ''),
  applyCatalogYarnOnlyToForm: vi.fn((_, f) => f),
  applyCatalogYarnColorToForm: vi.fn((_, f) => f),
}))

vi.mock('@/lib/data/colorFamilies', () => ({
  detectColorFamily: vi.fn(() => 'neutral'),
  COLOR_FAMILY_LABELS: ['Neutral', 'Rød', 'Blå'],
  COLOR_FAMILY_DEFAULT_HEX: { Neutral: '#ccc', Rød: '#f00', Blå: '#00f' },
  yarnMatchesStashSearch: vi.fn(() => true),
}))

vi.mock('@/lib/export/exportGarnlager', () => ({
  exportGarnlager: vi.fn(),
}))

vi.mock('@/components/app/BarcodeScanner', () => ({
  default: () => null,
}))

vi.mock('@/components/app/BrugNoeglerModal', () => ({
  default: () => null,
}))

// Garnlager.jsx importerer 5 sub-komponenter der trækker tunge dependency-træer
// ind (pdfjs, @zxing, react-aria-internals, etc.) når de evalueres af jsdom.
// I .behavior-test mocker vi dem til null/simple stubs — vi tester Garnlager's
// adfærd som container, ikke sub-komponenternes interne renderlogik.
vi.mock('@/components/app/KatalogInfoblok', () => ({
  default: () => null,
}))
vi.mock('@/components/app/BrugtOpFoldeUd', () => ({
  default: () => null,
}))
vi.mock('@/components/app/FarvekategoriCirkler', () => ({
  default: () => null,
}))
vi.mock('@/components/app/FlereFarverVælger', () => ({
  default: () => null,
}))
vi.mock('@/components/app/AntalStepper', () => ({
  default: () => null,
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_USER = { id: 'user-1', email: 'test@test.dk' }

const baseYarn = (overrides: Record<string, unknown> = {}) => ({
  id: 'yarn-1',
  name: 'Testgarn',
  brand: 'TestBrand',
  colorName: 'Rød',
  colorCode: '001',
  colorCategory: null,
  fiber: 'Uld',
  weight: 'DK',
  pindstr: '4',
  metrage: 200,
  antal: 3,
  status: 'På lager',
  hex: '#ff0000',
  hexColors: [],
  noter: '',
  barcode: null,
  imageUrl: null,
  catalogYarnId: null,
  catalogColorId: null,
  catalogImageUrl: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  ...overrides,
})

let Garnlager: React.ComponentType<{ user: unknown; onRequestLogin: () => void }>

// Per-test ydre referencer så testene kan styre hvad fetchYarns ser.
let yarnsForFetch: ReturnType<typeof baseYarn>[] = []

function setupFromMock(initialYarns: ReturnType<typeof baseYarn>[]) {
  yarnsForFetch = initialYarns
  mockFrom.mockImplementation(((table: string) => {
    if (table === 'projects') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }
    if (table === 'yarn_usage') {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }
    // yarn_items
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: yarnsForFetch, error: null }),
      ),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertReturn,
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdateReturn,
          })),
        })),
      })),
      delete: vi.fn(() => ({ eq: mockDeleteEq })),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  }) as never)
}

beforeEach(async () => {
  vi.clearAllMocks()
  try { window.localStorage.clear() } catch { /* jsdom edge */ }
  mockInsertReturn.mockResolvedValue({ data: baseYarn({ id: 'yarn-new' }), error: null })
  mockUpdateReturn.mockResolvedValue({ data: baseYarn(), error: null })
  mockDeleteEq.mockResolvedValue({ error: null })

  // Standard: ét garn på lager. Tests overskriver via setupFromMock.
  setupFromMock([baseYarn()])

  const mod = await import('@/components/app/Garnlager.jsx')
  Garnlager = mod.default
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Garnlager – adfærdstest (sikkerhedsnet for refaktorering)', () => {
  it('tilføj garn med navn og antal → vises i listen', async () => {
    setupFromMock([]) // start med tomt lager
    mockInsertReturn.mockResolvedValue({
      data: baseYarn({ id: 'yarn-new', name: 'Mit nye garn', brand: 'NyBrand', antal: 5 }),
      error: null,
    })

    const user = userEvent.setup()
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    // Vent på at tom-tilstand er rendret (loaded=true)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ tilføj garn/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /\+ tilføj garn/i }))

    // Modal åben — udfyld required-felter via deres labels
    await waitFor(() => {
      expect(screen.getByText('Tilføj garn')).toBeInTheDocument()
    })

    // Find inputs ved at gå op fra label-tekst — der er ingen explicit htmlFor
    const navnLabel = screen.getByText(/Garnnavn \*/)
    const navnInput = navnLabel.parentElement!.querySelector('input') as HTMLInputElement
    const mærkeLabel = screen.getByText(/Mærke \*/)
    const mærkeInput = mærkeLabel.parentElement!.querySelector('input') as HTMLInputElement

    await user.type(navnInput, 'Mit nye garn')
    await user.type(mærkeInput, 'NyBrand')

    // Sæt antal — vi accepterer at AntalStepper defaulter til 1; klik Tilføj
    await user.click(screen.getByRole('button', { name: /tilføj til lager/i }))

    // Verificer insert blev kaldt
    await waitFor(() => {
      expect(mockInsertReturn).toHaveBeenCalled()
    })

    // Modal lukker; det nye garn er synligt
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /tilføj til lager/i })).not.toBeInTheDocument()
    })
    expect(screen.getByText('Mit nye garn')).toBeInTheDocument()
  })

  it('rediger garn → ændringer gemmes og vises i listen', async () => {
    setupFromMock([baseYarn({ id: 'yarn-edit', name: 'Originalt garn', noter: '' })])
    mockUpdateReturn.mockResolvedValue({
      data: baseYarn({ id: 'yarn-edit', name: 'Originalt garn', noter: 'Min nye note' }),
      error: null,
    })

    const user = userEvent.setup()
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Originalt garn')).toBeInTheDocument()
    })

    // Åbn edit-modal ved at klikke på garn-navnet
    await user.click(screen.getByText('Originalt garn'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
    })

    // Find noter-textarea via label
    const noterLabel = screen.getByText(/^Noter$/)
    const noterField = noterLabel.parentElement!.querySelector('textarea') as HTMLTextAreaElement
    expect(noterField).toBeTruthy()
    await user.type(noterField, 'Min nye note')

    await user.click(screen.getByRole('button', { name: /gem ændringer/i }))

    await waitFor(() => {
      expect(mockUpdateReturn).toHaveBeenCalled()
    })

    // Modal lukket
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /gem ændringer/i })).not.toBeInTheDocument()
    })

    // Den opdaterede note er synlig i kortet (linje 1158 i Garnlager.jsx)
    expect(screen.getByText('Min nye note')).toBeInTheDocument()
  })

  it("filtrer på status 'I brug' → kun matchende garn vises", async () => {
    setupFromMock([
      baseYarn({ id: 'y-lager', name: 'På lager-garn', status: 'På lager' }),
      baseYarn({ id: 'y-brug', name: 'I brug-garn', status: 'I brug' }),
    ])

    const user = userEvent.setup()
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    // Begge garn synlige som default (default-filter skjuler kun "Brugt op")
    await waitFor(() => {
      expect(screen.getByText('På lager-garn')).toBeInTheDocument()
      expect(screen.getByText('I brug-garn')).toBeInTheDocument()
    })

    // Vælg "I brug" i status-dropdown
    const statusSelect = screen.getByDisplayValue('Alle statusser') as HTMLSelectElement
    await user.selectOptions(statusSelect, 'I brug')

    await waitFor(() => {
      expect(screen.getByText('I brug-garn')).toBeInTheDocument()
      expect(screen.queryByText('På lager-garn')).not.toBeInTheDocument()
    })
  })

  it('slet garn → bekræftelsesdialog → garn forsvinder fra listen', async () => {
    setupFromMock([baseYarn({ id: 'yarn-del', name: 'Garn der skal slettes' })])

    const user = userEvent.setup()
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Garn der skal slettes')).toBeInTheDocument()
    })

    // Åbn edit-modal
    await user.click(screen.getByText('Garn der skal slettes'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
    })

    // Klik Slet → bekræftelsesdialog vises
    await user.click(screen.getByRole('button', { name: /^slet$/i }))
    expect(screen.getByText(/er du sikker/i)).toBeInTheDocument()
    expect(mockDeleteEq).not.toHaveBeenCalled()

    // Klik Ja, slet
    await user.click(screen.getByRole('button', { name: /ja, slet/i }))

    await waitFor(() => {
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'yarn-del')
    })

    // Garnet er forsvundet fra listen
    await waitFor(() => {
      expect(screen.queryByText('Garn der skal slettes')).not.toBeInTheDocument()
    })
  })
})
